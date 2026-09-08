# ZappyMart Frontend

ZappyMart is a modern Angular web application for browsing and managing a product catalog with a wishlist feature. It showcases reactive state management using Angular Signals, a clean modular structure, and custom UI styling via SCSS and BEM conventions.

## Project Structure

src/
├── app/
│ ├── header/ # Top navigation with wishlist access
│
├── home/ # Homepage view
│ ├── over-ons/ # About us page
│ ├── products/ # Displays product listings
│ └── wish-list-drawer/ # Side drawer showing wishlist items
│ ├── shared/ # Reusable components, models, and services
└── assets/ # Static assets like fonts and images

## Features

- **Wishlist Functionality** – Add or remove products from a persistent wishlist
- **Signals-based Store** – Efficient state management using Angular's signal API
- **Component Communication** – Uses `@Input()` and `@Output()` for interaction between elements
- **SCSS & BEM Styling** – Maintainable styles using SCSS and BEM methodology
- **Unit Testing** – Fully tested components using Jest

## Getting Started

### Development server

Install dependencies and start the development server:

```bash
npm install
npm start

Navigate to http://localhost:4200. The application will auto-reload on changes.
Build

To compile the project for production:

npm run build

Build artifacts will be stored in the dist/ directory.
Testing

Run unit tests using Jest:

npm test

Watch mode:

npm run test:watch

Generate coverage report:

npm run test:coverage

Code Formatting

Format all files with Prettier:

npm run format

Linting

Run linter:

npm run lint

Fix lint issues automatically:

npm run lint:fix

Technologies Used

    Angular 19

    Jest for testing

    Angular Signals for state management

    SCSS for styling

    BEM naming convention

    Zone.js

    Prettier & ESLint

Routes
Path	Description
/	Home page
/over-ons	About us page
Assets & Fonts

Custom logos and fonts are stored under src/assets/.
Wishlist Drawer

The wishlist drawer can be toggled from the top navigation. It displays the products added to the wishlist and includes a counter badge. This feature is managed via a centralized service.
```
