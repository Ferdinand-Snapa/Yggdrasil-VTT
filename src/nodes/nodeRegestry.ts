import type { NodeDefenition, DataType, DataPort, FlowPort, DataValue } from '@/stores/codeGraph'

//constructors
function dataPort(id: string, name: string, type: DataType): DataPort {
  return { id, name, kind: 'data', type }
}

function flowPort(id: string, name: string): FlowPort {
  return { id, name, kind: 'flow' }
}

export const NodeRegestry: Record<string, NodeDefenition> = {
  start: {
    type: 'start',
    inputs: [],
    outputs: [flowPort('next', 'Next')],
    execute: () => ({
      next: true,
    }),
    category: 'Flow',
  },

  constNumber: {
    type: 'constNumber',
    inputs: [],
    outputs: [dataPort('const', 'Const', 'number')],
    evaluate: (_inputs, state) => ({
      const: state.value ?? 0,
    }),
    category: 'Getter',
  },

  compare: {
    type: 'compare',
    inputs: [dataPort('a', 'A', 'number'), dataPort('b', 'B', 'number')],
    outputs: [dataPort('isGreater', 'A > B', 'boolean')],
    evaluate: ({ a, b }) => ({
      isGreater: (a ?? 0) > (b ?? 0),
    }),
    category: 'Math',
  },

  equal: {
    type: 'equal',
    inputs: [dataPort('a', 'A', 'number'), dataPort('b', 'B', 'number')],
    outputs: [dataPort('isEqual', 'A = B', 'boolean')],
    evaluate: ({ a, b }) => ({
      isEqual: (a ?? 0) == (b ?? 0),
    }),
    category: 'Math',
  },

  log: {
    type: 'log',
    inputs: [flowPort('fire', 'Fire'), dataPort('value', 'Value', 'any')],
    outputs: [flowPort('next', 'Next')],

    execute: (inputs) => {
      console.log('LOG NODE:', inputs.value)
      return {
        next: true,
      }
    },
    category: 'Functions',
  },

  add: {
    type: 'add',
    inputs: [dataPort('a', 'A', 'number'), dataPort('b', 'B', 'number')],
    outputs: [dataPort('result', 'Result', 'number')],
    evaluate: ({ a, b }) => ({
      result: ((a as number) ?? 0) + ((b as number) ?? 0),
    }),
    category: 'Math',
  },

  mult: {
    type: 'mult',
    inputs: [dataPort('a', 'A', 'number'), dataPort('b', 'B', 'number')],
    outputs: [dataPort('result', 'Result', 'number')],
    evaluate: ({ a, b }) => ({
      result: ((a as number) ?? 0) * ((b as number) ?? 0),
    }),
    category: 'Math',
  },

  branch: {
    type: 'branch',
    inputs: [dataPort('condition', 'Condition', 'boolean')],
    outputs: [flowPort('true', 'True'), flowPort('false', 'False')],
    execute: ({ condition }) => ({
      [condition ? 'true' : 'false']: true,
    }),
    category: 'Flow',
  },

  loop: {
    type: 'loop',
    inputs: [dataPort('count', 'Count', 'number')],
    outputs: [
      dataPort('index', 'Index', 'number'),
      flowPort('loop', 'Loop'),
      flowPort('done', 'Done'),
    ],

    execute: (
      inputs: Record<string, DataValue>,
      state: Record<string, DataValue>,
    ): Record<string, DataValue> => {
      if (state['i'] === undefined) state.i = 0

      if (state['i'] < inputs['count']!) {
        const current = state.i
        state['i'] = (state['i'] as number) + 1

        return {
          index: current,
          loop: true,
        }
      }

      state.i = 0

      return {
        done: true,
      }
    },
    category: 'Flow',
  },
}
