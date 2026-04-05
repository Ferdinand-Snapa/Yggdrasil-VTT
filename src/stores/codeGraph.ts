import { defineStore } from 'pinia'

type NodeId = string
type PortId = string
type GraphId = string

interface Connection {
  fromNode: NodeId
  fromPort: PortId
  toNode: NodeId
  toPort: PortId
}

interface Graph {
  id: GraphId
  name: string

  nodes: Record<NodeId, Node>
  connections: Connection[]

  entryNodeId?: NodeId

  inputPorts?: PortDefenition[]
  outputPorts?: PortDefenition[]
}
//to be expanded
type DataType = 'number' | 'boolean' | 'string' | 'any'
//data refering value parsing and evaluation
type DataPort = {
  id: string
  name: string
  kind: 'data'
  type: DataType
}
//flow refering to order of execution
type FlowPort = {
  id: string
  name: string
  kind: 'flow'
}

export type PortDefenition = DataPort | FlowPort

export type DataValue = string | number | boolean

interface NodeDefenition {
  type: string
  //defining values in and out
  inputs: PortDefenition[]
  outputs: PortDefenition[]

  //functions without flow ports can evaluate results reqursively
  evaluate?: (
    // start --flow--> print(7)
    inputs: Record<string, DataValue>, //                       |
    state: Record<string, DataValue>, //                    add(a, b)
    ctx: ExecutionContext, //                         /\
  ) => Record<string, DataValue> //                        2  5

  //when recieving activation signal node will run execution
  execute?: (
    inputs: Record<string, DataValue>,
    state: Record<string, DataValue>,
    ctx: ExecutionContext,
  ) => Promise<Record<string, DataValue>> | Record<string, DataValue>

  onNodeStart?: (node: Node) => void
  onNodeFinish?: (node: Node, outputs: DataValue) => void

  subgraph?: Graph
}

interface PendingConnection {
  nodeId: string
  portId: string
  kind: 'input' | 'output'
  type: string
  portKind: 'data' | 'flow'
}

//constructors
function dataPort(id: string, name: string, type: DataType): DataPort {
  return { id, name, kind: 'data', type }
}

function flowPort(id: string, name: string): FlowPort {
  return { id, name, kind: 'flow' }
}

export interface Node {
  id: NodeId
  type: string
  position: { x: number; y: number }
  //Differences per node in execution
  state?: Record<string, DataValue>
}

//allows for runtime context
interface ExecutionContext {
  graph: Graph

  values: Map<string, DataValue> // key: `${nodeId}:${portId}`

  callHistory: ExecutionFrame[]

  executionCount: Map<NodeId, number>
}

//Each function / subgraph get's its own frame
//-Functions: log, recursion
interface ExecutionFrame {
  outputValue: Record<string, DataValue> //values generated    | key: `${portId}`
  inputFrame: Record<string, ExecutionFrame> //recursive evaluate  | key: `${portId}`

  nodeId?: string //caller node | null if from context

  blame?: string //for later when multiplayer
}

function executionFrame(
  outputValue: Record<string, DataValue>,
  inputFrame: Record<string, ExecutionFrame>,
  nodeId?: string,
  blame?: string,
): ExecutionFrame {
  return { outputValue, inputFrame, nodeId, blame }
}

function isPureDataNode(def: NodeDefenition): boolean {
  return def.inputs.every((p) => p.kind === 'data') && def.outputs.every((p) => p.kind === 'data')
}

const nodeRegestry: Record<string, NodeDefenition> = {
  start: {
    type: 'start',
    inputs: [],
    outputs: [flowPort('next', 'Next')],
    execute: () => ({
      next: true,
    }),
  },

  constNumber: {
    type: 'constNumber',
    inputs: [],
    outputs: [dataPort('const', 'Const', 'number')],
    evaluate: (_inputs, state) => ({
      const: state.value ?? 0,
    }),
  },

  compare: {
    type: 'compare',
    inputs: [dataPort('a', 'A', 'number'), dataPort('b', 'B', 'number')],
    outputs: [dataPort('isGreater', 'A > B', 'boolean')],
    evaluate: ({ a, b }) => ({
      isGreater: (a ?? 0) > (b ?? 0),
    }),
  },

  equal: {
    type: 'equal',
    inputs: [dataPort('a', 'A', 'number'), dataPort('b', 'B', 'number')],
    outputs: [dataPort('isEqual', 'A = B', 'boolean')],
    evaluate: ({ a, b }) => ({
      isEqual: (a ?? 0) == (b ?? 0),
    }),
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
  },

  add: {
    type: 'add',
    inputs: [dataPort('a', 'A', 'number'), dataPort('b', 'B', 'number')],
    outputs: [dataPort('result', 'Result', 'number')],
    evaluate: ({ a, b }) => ({
      result: ((a as number) ?? 0) + ((b as number) ?? 0),
    }),
  },

  mult: {
    type: 'mult',
    inputs: [dataPort('a', 'A', 'number'), dataPort('b', 'B', 'number')],
    outputs: [dataPort('result', 'Result', 'number')],
    evaluate: ({ a, b }) => ({
      result: ((a as number) ?? 0) * ((b as number) ?? 0),
    }),
  },

  branch: {
    type: 'branch',
    inputs: [dataPort('condition', 'Condition', 'boolean')],
    outputs: [flowPort('true', 'True'), flowPort('false', 'False')],
    execute: ({ condition }) => ({
      [condition ? 'true' : 'false']: true,
    }),
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
  },
}

function resolveInputs(
  node: Node,
  ctx: ExecutionContext,
): [Record<string, DataValue>, Record<string, ExecutionFrame>] {
  const inputs: Record<string, DataValue> = {}

  const inputFrame: Record<string, ExecutionFrame> = {}

  for (const conn of ctx.graph.connections) {
    if (conn.toNode === node.id) {
      const [value, frame] = getPortValue(conn.fromNode, conn.fromPort, ctx)
      inputFrame[conn.toPort] = frame
      inputs[conn.toPort] = value
    }
  }

  return [inputs, inputFrame]
}

const evaluating = new Set<string>()

function getPortValue(
  nodeId: string,
  portId: string,
  ctx: ExecutionContext,
): [DataValue, ExecutionFrame] {
  const key = `${nodeId}:${portId}`

  if (evaluating.has(key)) {
    throw new Error('Circular dependency detected')
  }
  evaluating.add(key)

  // if allready pressent in ctx
  if (ctx.values.has(key)) {
    const value: DataValue = ctx.values.get(key) as DataValue
    const output: Record<string, DataValue> = {}
    output[`${nodeId}:${portId}`] = value
    return [value, executionFrame(output, {}, nodeId)]
  }

  //Get Node
  const node = ctx.graph.nodes[nodeId]
  if (!node) {
    evaluating.delete(key)
    throw new Error('Failed to fetch node')
  }
  const def = nodeRegestry[node.type]

  if (!def?.evaluate || !isPureDataNode(def)) {
    evaluating.delete(key)
    throw new Error(`Cannot lazily evaluate node "${node.type}"`)
  }

  const [inputs, frame] = resolveInputs(node, ctx)

  const outputs: Record<string, DataValue> = def.evaluate(inputs, node.state ?? {}, ctx)

  for (const outId in outputs) {
    ctx.values.set(`${nodeId}:${outId}`, outputs[outId]!)
  }
  evaluating.delete(key)

  return [outputs[portId]!, executionFrame(outputs, frame, node.id)]
}

async function executeSubGraph(
  def: NodeDefenition,
  inputs: Record<string, DataValue>,
  _parentCtx: ExecutionContext,
): Promise<Record<string, DataValue>> {
  const subCtx: ExecutionContext = {
    graph: def.subgraph!,
    callHistory: [],
    values: new Map(),
    executionCount: new Map(),
  }

  for (const key in inputs) {
    subCtx.values.set(`input:${key}`, inputs[key]!)
  }

  await runGraph(def.subgraph!, 'entry', subCtx)

  const result: Record<string, DataValue> = {}

  for (const [key, value] of subCtx.values) {
    if (key.startsWith('output:')) {
      result[key.replace('output:', '')] = value
    }
  }

  return result
}

async function runGraph(
  graph: Graph,
  entryNodeId: string,
  parrentCtx?: ExecutionContext,
): Promise<void> {
  const ctx: ExecutionContext = parrentCtx ?? {
    graph,
    callHistory: [],
    values: new Map(),
    executionCount: new Map(),
  }
  // in case of subgraph overwrite graph
  ctx.graph = graph

  const startNode: Node | null = graph.nodes[entryNodeId] ?? null
  if (!startNode) {
    throw new Error(`invalid starting node${entryNodeId}`)
  }

  const queue: Node[] = [startNode]

  while (queue.length > 0) {
    //get node from queue
    const node = queue.shift()!
    //get functionality from registry
    const def = nodeRegestry[node.type]!

    //skip pure data node (should not be able to recieve flow)
    if (isPureDataNode(def)) continue

    const count = ctx.executionCount.get(node.id) ?? 0

    //if the same node has been ran 1000 times in same context
    if (count > 1000) throw new Error(`Inf loop detected at "${node.id}"`)
    //track runs per node
    ctx.executionCount.set(node.id, count + 1)

    const [inputs, inputFrame] = resolveInputs(node, ctx)

    let outputs: Record<string, DataValue> = {}

    if (def.execute) {
      outputs = await def.execute(inputs, node.state ?? {}, ctx)
    } else if (def.subgraph) {
      outputs = await executeSubGraph(def, inputs, ctx)
    }

    ctx.callHistory.push(executionFrame(outputs, inputFrame, node.id))

    //set port outputs for lazy
    for (const portId in outputs) {
      ctx.values.set(`${node.id}:${portId}`, outputs[portId]!)
    }

    for (const conn of graph.connections) {
      if (conn.fromNode === node.id) {
        const key = `${node.id}:${conn.fromPort}`

        if (ctx.values.get(key)) {
          const nextNode = graph.nodes[conn.toNode]
          if (nextNode) queue.push(nextNode)
        }
      }
    }
  }
  console.log(ctx.callHistory)
}

const createGraph = (name: string): Graph => {
  return {
    id: crypto.randomUUID(),
    name,
    nodes: {},
    connections: [],
    entryNodeId: undefined,
    inputPorts: [],
    outputPorts: [],
  }
}

export const useGraphStore = (graphName: string) => {
  const store = defineStore(graphName, {
    state: () => ({
      graph: createGraph(graphName),
      pendingConnection: null as PendingConnection | null,
    }),

    getters: {
      getNode: (state) => {
        return (nodeId: string) => state.graph.nodes[nodeId]
      },
    },

    actions: {
      addNode(node: Node) {
        this.graph.nodes[node.id] = node
      },
      startConnection(payLoad: PendingConnection) {
        this.pendingConnection = payLoad
      },
      cancelConnection() {
        this.pendingConnection = null
      },
      compleatConnection(to: PendingConnection) {
        const from = this.pendingConnection
        if (!from) return
        const validation: string | null = this.isValidConnection(from, to)
        if (validation) {
          this.cancelConnection()
          console.error(validation)
          return
        }
        const output: PendingConnection = from.kind === 'output' ? from : to
        const input: PendingConnection = from.kind === 'input' ? from : to

        const connection: Connection = {
          fromNode: output.nodeId,
          fromPort: output.portId,
          toNode: input.nodeId,
          toPort: input.portId,
        }

        this.connect(connection)
        this.cancelConnection()
      },
      isValidConnection(from: PendingConnection, to: PendingConnection): string | null {
        if (from.nodeId === to.nodeId) {
          return `${from.nodeId} -X-> ${to.nodeId} | Can't connect node to itself`
        }
        if (from.kind === to.kind) {
          return `${from.nodeId}:${from.portId} -X-> ${to.nodeId}:${to.portId} | Can't both be ${from.kind}`
        }

        const output: PendingConnection = from.kind === 'output' ? from : to
        const input: PendingConnection = from.kind === 'input' ? from : to

        const succsessLog = () => {
          console.log(`${output.nodeId}:${output.portId} --> ${input.nodeId}:${input.portId}`)
        }

        if (output.portKind !== input.portKind) {
          return `${output.nodeId}:${output.portId} -X-> ${input.nodeId}:${input.portId} | Can't missmatch flow and data ports`
        }
        if (output.portKind === 'flow') {
          succsessLog()
          return null
        }

        const outputDef: NodeDefenition = nodeRegestry[output.type]!
        const outputPort: DataPort = outputDef.outputs.find(
          (port) => port.id === output.portId,
        )! as DataPort

        const inputDef: NodeDefenition = nodeRegestry[input.type]!
        const inputPort: DataPort = inputDef.inputs.find(
          (port) => port.id === input.portId,
        )! as DataPort

        if (inputPort.type === 'any') {
          succsessLog()
          return null
        }

        if (inputPort.type !== outputPort.type) {
          return `${output.nodeId}:${output.portId} -X-> ${input.nodeId}:${input.portId} | Input expected ${inputPort.type} recieved ${outputPort.type}`
        }
        succsessLog()
        return null
      },
      connect(conenction: Connection) {
        //TODO: return erro on faulty connections
        this.graph.connections.push(conenction)
      },
      removeConnection(index: number) {
        this.graph.connections.splice(index, 1)
      },
      setEntryNode(nodeId: string) {
        this.graph.entryNodeId = nodeId
      },
      runCurrentGraph() {
        runGraph(this.graph, this.graph.entryNodeId!)
      },
      setNodePosition(nodeId: string, position: { x: number; y: number }) {
        this.graph.nodes[nodeId]!.position = position
      },
    },
  })
  return store()
}
