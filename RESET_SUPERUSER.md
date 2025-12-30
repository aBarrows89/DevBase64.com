# Reset Superuser Password

## Option 1: Using Convex Dashboard (Easiest)

1. Open the Convex dashboard: https://dashboard.convex.dev
2. Select your project
3. Go to "Functions" tab
4. Find and run the `auth:seedSuperuser` mutation
5. Provide these arguments:
   ```json
   {
     "email": "admin@ietires.com",
     "password": "Admin123!",
     "name": "Administrator"
   }
   ```
6. Click "Run"
7. Login with the email and password you just set

## Option 2: Using Convex CLI

```bash
npx convex run auth:seedSuperuser \
  --args '{"email":"admin@ietires.com","password":"Admin123!","name":"Administrator"}'
```

## Option 3: Using the Script

1. Make sure your `.env.local` file has the Convex URL:
   ```
   NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud
   ```

2. Edit `scripts/resetSuperuser.ts` to set your desired password

3. Run the script:
   ```bash
   npx tsx scripts/resetSuperuser.ts
   ```

## Default Credentials After Reset

- **Email:** admin@ietires.com
- **Password:** Admin123! (or whatever you set)

⚠️ **IMPORTANT:** Change your password immediately after logging in by going to Settings or Change Password page.

## Troubleshooting

- If you get "User not found" error, the superuser doesn't exist yet
- If you get "Users already exist" error from createInitialAdmin, use seedSuperuser instead
- Make sure you're connected to the correct Convex deployment
