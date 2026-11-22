# Complex Survey Analysis videos

PR Studio renders four short videos: Korean introduction and tutorial, plus English introduction and tutorial. The captures come from the live CSA staging app using its documented 24-row **synthetic** clustered survey CSV. The demonstrated analysis returned a weighted positive rate of 26.7% and a 95% confidence interval of 10.9–52.0%.

Run `python docs/demo-scripts/complex-survey-analysis/render.py` after placing the actual app captures in `out/csa-videos/captures`. The script uses PR Studio's `scripts/synthesize-speech.mjs` with Google Cloud Chirp3 HD for both languages. Korean narration writes out acronyms and numbers phonetically; English narration spells ambiguous file types and decimals. Each short scene is synthesized independently and gets 1.4 seconds of trailing space. The output includes four MP4 files, four SRT files, and per-video receipts under `out/csa-videos`.

The output files are published as assets in the public `cnucho/research-app-examples` GitHub release `csa-videos-20261122`. MethodIQ hosts separate Korean and English pages at `/ci/csa-videos/ko` and `/ci/csa-videos/en`. The English video shows the current Korean app UI, with English narration and on-screen captions.
