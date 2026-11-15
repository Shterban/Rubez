import Home from "@/pages/Home.jsx";
import Servers from "@/pages/Servers.jsx";
import Builder from "@/pages/Builder.jsx";
import Player from "@/pages/Player.jsx";
import Owner from "@/pages/Owner.jsx";
import Login from "@/pages/Login.jsx";
import Register from "@/pages/Register.jsx";

// `access: "owner"` — кабинет только для владельца приложения и его команды.
export const routes = [
  { path: "/", label: "Главная", element: <Home /> },
  { path: "/servers", label: "Серверы", element: <Servers /> },
  { path: "/builder", label: "Конструктор", element: <Builder /> },
  { path: "/player", label: "Игрокам", element: <Player /> },
  { path: "/owner", label: "Кабинет", element: <Owner />, access: "owner" },
  { path: "/login", label: "Вход", element: <Login /> },
  { path: "/register", label: "Регистрация", element: <Register /> },
];
