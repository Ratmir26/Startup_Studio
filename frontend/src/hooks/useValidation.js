import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useValidationStore = create(
  persist(
    (set, get) => ({
      // State
      idea: '',
      arguments: {
        pro: [],
        con: []
      },
      checked: null, // 'yes' | 'no' | null

      // Actions
      setIdea: (idea) => set({ idea }),
      
      addArgument: (type, text) => {
        set((state) => ({
          arguments: {
            ...state.arguments,
            [type]: [
              ...state.arguments[type],
              { id: Date.now().toString(), text, votes: 0 }
            ]
          }
        }));
      },

      removeArgument: (type, id) => {
        set((state) => ({
          arguments: {
            ...state.arguments,
            [type]: state.arguments[type].filter(a => a.id !== id)
          }
        }));
      },

      editArgument: (type, id, newText) => {
        set((state) => ({
          arguments: {
            ...state.arguments,
            [type]: state.arguments[type].map(a =>
              a.id === id ? { ...a, text: newText } : a
            )
          }
        }));
      },

      voteArgument: (type, id, delta) => {
        set((state) => ({
          arguments: {
            ...state.arguments,
            [type]: state.arguments[type].map(a =>
              a.id === id ? { ...a, votes: a.votes + delta } : a
            )
          }
        }));
      },

      setChecked: (value) => set({ checked: value }),

      getVerdict: () => {
        const { arguments: args } = get();
        const pro = args.pro.length;
        const con = args.con.length;
        const total = pro + con;
        const score = pro - con;

        if (total === 0) return { text: '🤔 Добавь аргументы', type: 'neutral' };
        if (total < 3) return { text: '🤔 Нужно больше данных', type: 'neutral' };
        if (pro > con * 1.5) return { text: '🚀 Идея перспективная!', type: 'positive' };
        if (con > pro * 1.5) return { text: '❌ Идея слабая', type: 'negative' };
        if (score > 0) return { text: '👍 Скорее перспективная', type: 'positive' };
        if (score < 0) return { text: '👎 Скорее слабая', type: 'negative' };
        return { text: '⚖️ Равновесие', type: 'neutral' };
      },

      reset: () => set({ idea: '', arguments: { pro: [], con: [] }, checked: null })
    }),
    {
      name: 'validation-storage-v2',
      partialize: (state) => ({
        idea: state.idea,
        arguments: state.arguments,
        checked: state.checked
      })
    }
  )
);

export default useValidationStore;