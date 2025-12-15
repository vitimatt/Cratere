# Cratere - Next.js + Sanity CMS

A Next.js 14+ application with embedded Sanity CMS, configured to work seamlessly both locally and on Netlify.

## Features

- ✅ Next.js 14+ with TypeScript and App Router
- ✅ Sanity Studio embedded at `/studio`
- ✅ Fully TypeScript compatible
- ✅ Basic Post schema (title, slug, body)
- ✅ Ready for Netlify deployment
- ✅ Single command to run everything locally

## Project Structure

```
.
├── app/
│   ├── studio/
│   │   └── [[...index]]/
│   │       └── page.tsx      # Embedded Sanity Studio route
│   ├── layout.tsx             # Root layout
│   ├── page.tsx               # Home page
│   └── globals.css            # Global styles
├── sanity/
│   └── schemas/
│       ├── index.ts           # Schema exports
│       └── post.ts            # Post schema definition
├── sanity.config.ts          # Sanity Studio configuration
├── sanity.cli.ts             # Sanity CLI configuration
├── next.config.js            # Next.js configuration
├── netlify.toml              # Netlify deployment configuration
└── package.json             # Dependencies and scripts
```

## Prerequisites

- Node.js 18+ installed
- npm or yarn package manager

## Local Development

### 1. Install Dependencies

```bash
npm install
```

### 2. Run Development Server

```bash
npm run dev
```

This single command will:
- Start the Next.js development server on `http://localhost:3000`
- Make the embedded Sanity Studio available at `http://localhost:3000/studio`

### 3. Access the Application

- **Frontend**: Open [http://localhost:3000](http://localhost:3000)
- **Sanity Studio**: Open [http://localhost:3000/studio](http://localhost:3000/studio)

## Sanity Configuration

The project is configured with:
- **Project ID**: `jeo4p1su`
- **Dataset**: `production`
- **Studio Path**: `/studio`

### Creating Content

1. Navigate to `/studio` in your browser
2. Click "Create new" to add a new Post
3. Fill in the title, slug, and body content
4. Click "Publish" to save your content

## Netlify Deployment

### Option 1: Deploy via Netlify Dashboard

1. **Push your code to GitHub/GitLab/Bitbucket**

2. **Connect to Netlify**:
   - Go to [Netlify](https://app.netlify.com)
   - Click "Add new site" → "Import an existing project"
   - Connect your repository

3. **Configure Build Settings** (should be auto-detected):
   - **Build command**: `npm run build`
   - **Publish directory**: `.next`
   - **Node version**: `18` (or higher)

4. **Environment Variables** (if needed):
   - No environment variables are required for basic setup
   - The Sanity project ID and dataset are configured in `sanity.config.ts`

5. **Deploy**:
   - Click "Deploy site"
   - Netlify will automatically build and deploy your site

### Option 2: Deploy via Netlify CLI

1. **Install Netlify CLI**:
   ```bash
   npm install -g netlify-cli
   ```

2. **Login to Netlify**:
   ```bash
   netlify login
   ```

3. **Initialize and Deploy**:
   ```bash
   netlify init
   netlify deploy --prod
   ```

### Post-Deployment

After deployment:
- Your frontend will be available at your Netlify URL (e.g., `https://your-site.netlify.app`)
- Sanity Studio will be available at `https://your-site.netlify.app/studio`

## Available Scripts

- `npm run dev` - Start development server (runs both Next.js and embedded Studio)
- `npm run build` - Build the application for production
- `npm run start` - Start production server (after build)
- `npm run lint` - Run ESLint
- `npm run sanity` - Run Sanity Studio standalone (optional, for development)

## Troubleshooting

### Studio not loading

- Ensure you're accessing `/studio` (not `/studio/`)
- Check browser console for errors
- Verify Sanity project ID and dataset are correct in `sanity.config.ts`

### Build errors on Netlify

- Ensure Node.js version is set to 18+ in Netlify build settings
- Check that all dependencies are listed in `package.json`
- Review Netlify build logs for specific error messages

### TypeScript errors

- Run `npm install` to ensure all type definitions are installed
- Check `tsconfig.json` is properly configured

## Customization

### Adding New Schema Types

1. Create a new schema file in `sanity/schemas/`
2. Export it from `sanity/schemas/index.ts`
3. The Studio will automatically pick up the new schema

### Modifying Sanity Configuration

Edit `sanity.config.ts` to:
- Add new plugins
- Customize Studio appearance
- Configure additional settings

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Sanity Documentation](https://www.sanity.io/docs)
- [Netlify Documentation](https://docs.netlify.com)

## License

MIT



