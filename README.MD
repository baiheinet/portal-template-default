# nocobase-admin-starter

## NocoBase configuration

Copy `.env.example` to `.env.local` and set the NocoBase API URL. The default `basic` authenticator uses the NocoBase username or email and password login. For local development, a temporary access token can be supplied through `NOCOBASE_API_TOKEN`; do not commit it. The data provider sends it as `Authorization: Bearer <token>`.

If you call a remote NocoBase instance from `http://localhost:*`, the browser may block `auth:signIn` because NocoBase requires the `X-Authenticator` request header and the remote server must explicitly allow it in CORS preflight responses. In local Vite development, prefer using the built-in dev proxy:

```env
NOCOBASE_API_URL=https://develop.v2.test.nocobase.com/nocobase/api/__app/cms
```

In development, the app auto-detects the proxy target from `NOCOBASE_API_URL` when that value is an absolute URL. The configured API URL can stay on the original sub-app path such as `/nocobase/api/__app/cms`.

Refine resource names must match NocoBase collection names. For example, the supplied Swagger document exposes `collectionCategories`, so use that name when registering a corresponding Refine resource.

## Available Scripts

### Running the development server.

```bash
pnpm dev
```

### Building for production.

```bash
pnpm build
```

### Running the production server.

```bash
pnpm start
```

## Learn More

To learn more about **Refine**, please check out the [Documentation](https://refine.dev/docs)

- **REST Data Provider** [Docs](https://refine.dev/docs/core/providers/data-provider/#overview)
- **shadcn/ui** [Docs](https://refine.dev/docs/guides-concepts/general-concepts/#headless-concept)
- **React Router** [Docs](https://refine.dev/docs/core/providers/router-provider/)
- **Custom Auth Provider** [Docs](https://refine.dev/docs/core/providers/auth-provider/)

## License

MIT
