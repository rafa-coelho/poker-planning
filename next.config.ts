import type { NextConfig } from "next";
import { APP_CONFIG } from './src/lib/config';

const nextConfig: NextConfig = {
  env: {
    APP_NAME: APP_CONFIG.APP_NAME,
    APP_VERSION: APP_CONFIG.APP_VERSION,
  },
  /* config options here */
};

export default nextConfig;
