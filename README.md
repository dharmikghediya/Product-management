# Product Management

## Super Admin setup

Set `SUPER_ADMIN_EMAIL` and `SUPER_ADMIN_PASSWORD` in the server environment before starting the API. On startup, the API creates an Admin account for that email if one does not already exist. Use a unique password of 8 to 128 characters and keep it out of source control.

If that email already belongs to an account, startup grants it the Admin role without changing its existing password. The configured password is only used when the account is first created.

To change the password for a signed-in account, open the account menu in the application, choose **Change password**, and enter the current password and the new password. Updating `SUPER_ADMIN_PASSWORD` in `.env` does not reset an existing account's password.

Self-service registrations always create regular User accounts. An Admin can grant additional permissions from the user-management page.
