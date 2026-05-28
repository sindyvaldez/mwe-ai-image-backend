# White‑label AI Image Generator Backend

This directory contains a serverless function for generating branded images using the OpenAI
image API.  It is designed to be deployed to a platform such as Vercel or Netlify and
exposes a POST endpoint at `/api/generate`.  The endpoint accepts a JSON payload with the
following properties:

| Field      | Type   | Description                                             |
|------------|--------|---------------------------------------------------------|
| `prompt`   | string | The user’s description of the desired image.           |
| `imageType`| string | The type of image (e.g. "social media graphic").       |
| `style`    | string | The stylistic guidance (e.g. "clean, professional").   |
| `accessCode`| string| A shared secret that limits who can generate images.    |

If the access code matches the `ACCESS_CODE` environment variable and the prompt is of
reasonable length, the function sends a request to the OpenAI Image API (GPT‑image‑2) and
returns a base64‑encoded PNG image.

## Environment variables

Create environment variables for your deployment:

- **OPENAI_API_KEY** – your OpenAI API key (do *not* hard‑code this value)
- **ACCESS_CODE** – a secret string that must be provided by the frontend in order to
  generate an image (choose any string you like)

On Vercel you can set these in the project’s *Environment Variables* section.  On
Netlify use the site’s environment variables settings.

## Deploying on Vercel

1. Install the Vercel CLI (if you haven’t already):
   ```sh
   npm install -g vercel
   ```
2. From within the `backend` directory, run `vercel init` (follow the prompts to link
   your account) or create a new project in the Vercel web UI pointing to this directory.
3. Add the environment variables `OPENAI_API_KEY` and `ACCESS_CODE` in the Vercel
   dashboard.  You can add them as `Environment Variables` under your project’s
   settings.
4. Deploy the project:
   ```sh
   vercel --prod
   ```
5. Note the URL of the deployed function (for example,
   `https://your-project.vercel.app/api/generate`) and set that URL in the Squarespace
   code block (replace `BACKEND_URL` in the script).

## Testing locally

If you want to test the API locally, you can run a simple Express server instead of a
serverless function by creating a minimal wrapper like the following:

```js
import express from 'express';
import handler from './api/generate.js';

const app = express();
app.use(express.json());
app.post('/api/generate', handler);

app.listen(3000, () => {
  console.log('Listening on port 3000');
});
```

Set your environment variables (`OPENAI_API_KEY` and `ACCESS_CODE`), then run the server
using `node server.js`.  You can then test the endpoint using `curl` or a tool like
Postman.

## Security note

Do not embed your OpenAI API key in any client‑side code (e.g. the Squarespace code block).
Your backend function is responsible for calling the OpenAI API and returning the result.  The
`accessCode` is a simple way to prevent unauthorized usage; you can expand this by
integrating with a database or adding rate limiting logic for more control.