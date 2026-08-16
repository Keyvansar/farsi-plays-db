// src/test/setup.js
import { expect } from 'vitest';
import * as matchers from '@testing-library/jest-dom/matchers';

// This connects the custom jest-dom matchers to Vitest's expect function
expect.extend(matchers);