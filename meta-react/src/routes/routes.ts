import AboutPage from "../pages/About";
import HomePage from "../pages/Home";

interface Route {
  path: string;
  component: React.ElementType;
}

const publicRoutes: Route[] = [
  {
    path: '/',
    component: HomePage,
  },
  {
    path: '/about',
    component: AboutPage,
  },
];

export { publicRoutes };
