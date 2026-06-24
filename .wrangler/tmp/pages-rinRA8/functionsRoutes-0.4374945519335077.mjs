import { onRequestGet as __api_signup_js_onRequestGet } from "C:\\Users\\anaaky\\Desktop\\something\\functions\\api\\signup.js"
import { onRequestPost as __api_signup_js_onRequestPost } from "C:\\Users\\anaaky\\Desktop\\something\\functions\\api\\signup.js"

export const routes = [
    {
      routePath: "/api/signup",
      mountPath: "/api",
      method: "GET",
      middlewares: [],
      modules: [__api_signup_js_onRequestGet],
    },
  {
      routePath: "/api/signup",
      mountPath: "/api",
      method: "POST",
      middlewares: [],
      modules: [__api_signup_js_onRequestPost],
    },
  ]