# Frontend Guide

This client uses React components and regular CSS. Start it from the `client` folder:

```powershell
npm install
npm run dev
```

Open the local URL printed by Vite. The API server should be running on port `3000`.

The app opens on the sign-in screen. Choose **Register** to create an account, or sign in with an existing account. After changing server files, restart the API with `npm run dev` from the project root. Set `AUTH_SECRET` in the server environment to a long, private random value so sessions remain valid across server restarts.

## Where to look

- `src/main.jsx` starts React and loads the global styles.
- `src/modules/auth/` contains account sign-in and registration.
- `src/modules/products/` contains the inventory feature.
- `src/modules/products/ProductManagement.jsx` is the Products page. It loads products, filters them, and handles add, edit, and delete actions.
- `src/modules/products/components/` contains smaller product UI pieces: catalogue, dialog, and metrics.
- `src/modules/products/api/productsApi.js` sends inventory requests to the backend.
- `src/modules/auth/AuthScreen.jsx` displays the sign-in and register forms.
- `src/modules/auth/authApi.js` handles auth requests and saved login state.
- `src/modules/products/components/ProductMetrics.jsx` displays the inventory totals.
- `src/modules/products/components/ProductCatalogue.jsx` displays search, category filters, and the product table.
- `src/modules/products/components/ProductDialog.jsx` contains the add/edit form.
- `src/styles.css` contains the page-wide defaults and color variables.
- `src/modules/products/products.css` styles the Products module using regular CSS selectors.

## Simple structure guide

- A **module** is a folder for one feature, such as `auth` or `products`.
- A **component** is a React function that displays one screen or part of a screen.
- Keep a component in its feature folder when that feature is the only place using it.
- Split a new component out when a screen becomes hard to read or a piece of UI is reused.

The app starts in `main.jsx`, then opens `ProductManagement.jsx`. That page checks for a saved login: without one, it shows `AuthScreen`; with one, it loads the inventory and uses the smaller product components.

## How adding a product works

1. The Products page opens the dialog when you click **Add product**.
2. The dialog collects the values and calls the page's `saveProduct` function.
3. The page calls `createProduct` in `productsApi.js`.
4. The API helper sends the request to the backend, then the page updates the product list.

Editing and deleting follow the same pattern: the page owns the data, components display it, and `productsApi.js` talks to the backend.