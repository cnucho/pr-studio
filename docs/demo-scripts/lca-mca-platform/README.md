# LCA–MCA platform videos

Two Korean videos use actual Streamlit states and a fresh calculation on the
public, fully synthetic `tutorial-v1` mobility survey. They are not a replay of
precomputed result files. `capture.mjs` imports the CSV and codebook, exercises
both LCA and MCA, and checks both final export ZIPs contain `report.docx`.

Source data: `D:\Git\research-app-examples\lca-mca-platform\tutorial-v1`.
The CSV SHA-256 is
`d09b7730ff5ef5bbf3746d9556db19cb1ba488d6001e9c5fb72c1b60e16a5685`.
The public release is
https://github.com/cnucho/research-app-examples/releases/tag/lca-mca-tutorial-v1.

## Produce

Start the current Streamlit app at `http://127.0.0.1:8765`, generate the dataset
into `D:\Git\research-app-examples\out\lca-mca-tutorial-v1b`, then run:

```powershell
node docs/demo-scripts/lca-mca-platform/capture.mjs
python docs/demo-scripts/lca-mca-platform/render.py intro
python docs/demo-scripts/lca-mca-platform/render.py tutorial
```

The renderer uses Google Cloud Korean Chirp 3 HD TTS and FFmpeg. Keep its
credential in the existing local secure location; never put it in this repo.
Outputs and capture receipts are under ignored `out/lca-mca-platform/`.
The renderer performs a full media decode and saves sample frames. Check the
frames, transcript, captions, and capture receipt before publishing. The
published release carries the videos, SRT captions, and data package.

YouTube Studio is the publication path; this repository does not contain an
in-app YouTube uploader. Titles and descriptions are in
`youtube-metadata-ko.md`. Record the final YouTube URLs there after upload.
