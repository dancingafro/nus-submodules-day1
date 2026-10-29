# Snip CLI

A zero-dependency command-line client for the Snip URL shortener. Requires Node.js 18 or newer for global `fetch`.

```text
snip add https://example.com/a/long/path
snip ls
snip open Ab12Cd
```

Set `SNIP_API` to use a different backend URL. It defaults to `http://localhost:3000`.

Run directly with `node cli.js`, `./snip`, `snip.cmd`, or `snip.ps1` from this folder.
