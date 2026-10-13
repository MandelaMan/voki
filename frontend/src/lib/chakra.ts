import { createSystem, defaultConfig, defineConfig } from '@chakra-ui/react';

export const system = createSystem(defaultConfig, defineConfig({
  preflight: false,
}));
