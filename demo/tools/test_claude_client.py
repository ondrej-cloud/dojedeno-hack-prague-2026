"""No paid requests: all HTTP operations are mocked."""
import base64
import copy
import io
import json
import os
from pathlib import Path
import socket
import tempfile
import unittest
from unittest.mock import patch
from urllib.error import HTTPError, URLError
import claude_client as client

IMAGE = base64.b64encode((Path(__file__).resolve().parents[1] / 'assets/plate-full.jpg').read_bytes()).decode()
RESULT = {'plateDetected': True, 'dishName': 'Knedlíky',
          'components': [{'name': 'Knedlík', 'estimatedGrams': 180, 'amountDescription': '4 kusy'},
                         {'name': 'Omáčka', 'estimatedGrams': 220, 'amountDescription': 'porce'}],
          'estimatedTotalGrams': 999, 'remainingPercent': 60, 'comparableToReference': True,
          'confidence': 'high', 'notes': 'Odhad, nikoli měření.',
          'scaleReading': {'visible': True, 'grams': 400, 'confidence': 'high'}}


def payload():
    return {'requestId': 'plate-1', 'phase': 'reference', 'image': IMAGE}


def response(result=None, **extra):
    body = {'stop_reason': 'end_turn', 'content': [{'type': 'text', 'text': json.dumps(RESULT if result is None else result)}],
            'usage': {'input_tokens': 120, 'output_tokens': 80, 'secret': 'omit'}}
    body.update(extra)
    return io.BytesIO(json.dumps(body).encode())


class ClaudeClientTests(unittest.TestCase):
    def setUp(self):
        self.env = patch.dict(os.environ, {'ANTHROPIC_API_KEY': 'test-only-secret', 'ANTHROPIC_MODEL': 'claude-haiku-5-5'})
        self.env.start()
        self.addCleanup(self.env.stop)

    def test_relative_schema_request_and_ocr(self):
        with patch.object(client.request, 'urlopen', return_value=response()) as call:
            actual = client.analyze(payload(), ['Knedlíky'])
        self.assertEqual(call.call_count, 1)
        req = call.call_args.args[0]
        self.assertEqual(req.full_url, 'https://api.anthropic.com/v1/messages')
        self.assertEqual(call.call_args.kwargs['timeout'], 45)
        body = json.loads(req.data)
        self.assertEqual(body['output_config']['format']['type'], 'json_schema')
        self.assertEqual(body['messages'][0]['content'][1]['source']['data'], IMAGE)
        self.assertNotIn('test-only-secret', req.data.decode())
        result = actual['result']
        self.assertIsNone(result['estimatedTotalGrams'])
        self.assertTrue(all(c['estimatedGrams'] is None for c in result['components']))
        self.assertIsNone(result['remainingPercent'])
        self.assertFalse(result['comparableToReference'])
        self.assertEqual(result['scaleReading']['grams'], 400)
        self.assertEqual(actual['usage'], {'input_tokens': 120, 'output_tokens': 80})

    def test_reference_comparison_and_sum(self):
        data = payload(); data.update(phase='leftover', reference={'image': IMAGE, 'result': copy.deepcopy(RESULT)})
        with patch.object(client.request, 'urlopen', return_value=response()) as call:
            actual = client.analyze(data, [], quantity_mode='estimate')['result']
        self.assertEqual(actual['estimatedTotalGrams'], 400)
        self.assertEqual(actual['remainingPercent'], 60)
        self.assertTrue(actual['comparableToReference'])
        blocks = json.loads(call.call_args.args[0].data)['messages'][0]['content']
        self.assertEqual(sum(b['type'] == 'image' for b in blocks), 2)

    def test_unknown_mass_not_summed(self):
        result = copy.deepcopy(RESULT); result['components'][0]['estimatedGrams'] = None
        with patch.object(client.request, 'urlopen', return_value=response(result)):
            self.assertIsNone(client.analyze(payload(), [], 'estimate')['result']['estimatedTotalGrams'])

    def test_weak_ocr_cannot_be_measurement(self):
        for visible, confidence in [(True, 'low'), (False, 'high')]:
            result = copy.deepcopy(RESULT); result['scaleReading'].update(visible=visible, confidence=confidence)
            with patch.object(client.request, 'urlopen', return_value=response(result)):
                self.assertIsNone(client.analyze(payload(), [])['result']['scaleReading']['grams'])

    def test_noncomparable_and_no_plate(self):
        for change in [{'plateDetected': False}, {'comparableToReference': False}]:
            result = copy.deepcopy(RESULT); result.update(change)
            data = payload(); data.update(phase='leftover', reference={'image': IMAGE, 'result': copy.deepcopy(RESULT)})
            with patch.object(client.request, 'urlopen', return_value=response(result)):
                self.assertIsNone(client.analyze(data, [])['result']['remainingPercent'])

    def test_bad_input_never_calls_api(self):
        bad = [None, [], {}, {**payload(), 'requestId': 5}, {**payload(), 'phase': 'unknown'},
               {**payload(), 'image': 'bad!'}, {**payload(), 'image': base64.b64encode(b'\xff\xd8fake-jpeg\xff\xd9').decode()}, {**payload(), 'image': base64.b64encode(b'not jpeg').decode()},
               {**payload(), 'image': 'A' * (2 * 1024 * 1024)}, {**payload(), 'measuredGrams': True},
               {**payload(), 'measuredGrams': -1}, {**payload(), 'reference': {'image': IMAGE, 'result': {}}}]
        with patch.object(client.request, 'urlopen') as call:
            for data in bad:
                with self.subTest(data_type=type(data).__name__), self.assertRaises(client.AnalysisError) as caught:
                    client.analyze(data, [])
                self.assertEqual(caught.exception.status_code, 400)
            call.assert_not_called()

    def test_invalid_results(self):
        invalid = [None, [], {**RESULT, 'remainingPercent': 101}, {**RESULT, 'estimatedTotalGrams': True},
                   {**RESULT, 'components': RESULT['components'] * 4}, {**RESULT, 'confidence': 'certain'},
                   {**RESULT, 'plateDetected': 'yes'}, {**RESULT, 'scaleReading': {'visible': True, 'grams': -1, 'confidence': 'high'}}]
        for value in invalid:
            body = {'stop_reason': 'end_turn', 'content': [{'type': 'text', 'text': json.dumps(value)}]}
            with self.subTest(value=value), patch.object(client.request, 'urlopen', return_value=io.BytesIO(json.dumps(body).encode())):
                with self.assertRaises(client.AnalysisError) as caught:
                    client.analyze(payload(), [])
                self.assertEqual(caught.exception.code, 'invalid_response')
        with patch.object(client.request, 'urlopen', return_value=response(stop_reason='max_tokens')):
            with self.assertRaises(client.AnalysisError):
                client.analyze(payload(), [])

    def test_http_errors_safe_and_not_retried(self):
        cases = [(401, 'authentication'), (402, 'credits_or_access'), (403, 'credits_or_access'),
                 (429, 'rate_limited'), (400, 'request_rejected'), (500, 'upstream')]
        for code, expected in cases:
            exc = HTTPError(client.API_URL, code, 'vendor-secret', {}, io.BytesIO(b'test-only-secret'))
            with patch.object(client.request, 'urlopen', side_effect=exc) as call:
                with self.assertRaises(client.AnalysisError) as caught:
                    client.analyze(payload(), [])
                self.assertEqual(caught.exception.code, expected)
                self.assertNotIn('secret', caught.exception.public_message)
                self.assertEqual(call.call_count, 1)
        for error, expected in [(socket.timeout(), 'timeout'), (URLError(socket.timeout()), 'timeout'), (URLError('secret-network-error'), 'network')]:
            with patch.object(client.request, 'urlopen', side_effect=error):
                with self.assertRaises(client.AnalysisError) as caught:
                    client.analyze(payload(), [])
                self.assertEqual(caught.exception.code, expected)

    def test_key_file_reloads_and_missing_config(self):
        with tempfile.TemporaryDirectory() as directory, patch.dict(os.environ, {'ANTHROPIC_API_KEY': ''}), patch.object(client, 'KEY_PATH', Path(directory) / 'key'):
            self.assertFalse(client.get_status()['configured'])
            with patch.object(client.request, 'urlopen') as call:
                with self.assertRaises(client.AnalysisError) as caught:
                    client.analyze(payload(), [])
                self.assertEqual(caught.exception.code, 'not_configured'); call.assert_not_called()
            client.KEY_PATH.write_text('first-key')
            self.assertTrue(client.get_status()['configured'])
            client.KEY_PATH.write_text('second-key')
            with patch.object(client.request, 'urlopen', return_value=response()) as call:
                client.analyze(payload(), [])
                self.assertEqual(call.call_args.args[0].get_header('X-api-key'), 'second-key')
            self.assertNotIn('key', json.dumps(client.get_status()))


if __name__ == '__main__':
    unittest.main()
