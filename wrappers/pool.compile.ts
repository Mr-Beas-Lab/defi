import { CompilerConfig } from 'ton';

export const compile: CompilerConfig = {
    lang: 'func',
    targets: ['contracts/pool.fc'],
    optLevel: 2
};
