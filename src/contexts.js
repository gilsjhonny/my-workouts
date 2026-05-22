import { createContext } from 'react';

export const ExerciseNamesContext = createContext({ get: x => x, rename: () => {}, hasRename: () => false });
export const RoutineNamesContext = createContext({ get: x => x, rename: () => {}, hasRename: () => false });
