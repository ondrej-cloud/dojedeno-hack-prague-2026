#!/usr/bin/env python3
"""Explicit paid vision benchmark. One Opus baseline, three Sonnet/Haiku runs by default."""
import argparse
import base64
import hashlib
import json
import os
from pathlib import Path
import time
import uuid
import claude_client

ROOT = Path(__file__).resolve().parents[1]
# Official list prices, USD / million tokens, checked 2026-10-31. No caching requested.
PRICES = {'claude-opus-5-5': (4, 20), 'claude-sonnet-5-5': (2, 10), 'claude-haiku-5-5': (.1, .5)}

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('image',type=Path)
    parser.add_argument('--output',type=Path,default=ROOT/'.local/model-benchmark.json')
    args=parser.parse_args()
    photo=args.image.read_bytes()
    encoded=base64.b64encode(photo).decode()
    menu=json.loads((ROOT/'config.json').read_text())['menu']
    report={'imageSha256':hashlib.sha256(photo).hexdigest(),'effort':'medium','scope':'Single user-supplied food photo; not general accuracy validation; no scale display.','runs':[]}
    os.environ['ANTHROPIC_EFFORT']='medium'
    for model,repeats in [('claude-opus-5-5',1),('claude-sonnet-5-5',3),('claude-haiku-5-5',3)]:
        os.environ['ANTHROPIC_MODEL']=model
        for repeat in range(1,repeats+1):
            before=time.monotonic()
            run={'model':model,'repeat':repeat}
            try:
                result=claude_client.analyze({'requestId':str(uuid.uuid4()),'phase':'reference','image':encoded},menu,'relative')
                usage=result['usage'];incoming,outgoing=PRICES[model]
                run.update(result)
                run['estimatedCostUsd']=(usage.get('input_tokens',0)*incoming+usage.get('output_tokens',0)*outgoing)/1e6
            except claude_client.AnalysisError as error:
                run['error']={'code':error.code,'message':error.public_message}
            run['elapsedSeconds']=round(time.monotonic()-before,2)
            report['runs'].append(run)
            args.output.parent.mkdir(parents=True,exist_ok=True)
            args.output.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
            print(json.dumps(run,ensure_ascii=False),flush=True)
    print('Benchmark complete. Raw results are local-only:',args.output,flush=True)

if __name__=='__main__':main()
