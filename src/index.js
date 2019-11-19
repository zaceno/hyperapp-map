/*

makeActionMap = (extract, merge) -> action Map

put any Action in it, and it will return the corresponding action
it will first dig into a stack of payload filters to apply the transform
to the actual function. If the actual function is in memo, it will return
the memoized transform. Otherwise it will return a new transform of the action
and memoize the transform. And part of that means using the

*/
const isFunc = x => typeof x === 'function'

const isAction = action =>
    isFunc(action) || (Array.isArray(action) && isAction(action[0]))

const deepMap = (map, action) =>
    isFunc(action) ? map(action) : [deepMap(map, action[0]), action[1]]

const getResult = (action, state, payload) =>
    isFunc(action)
        ? getResult(action(state, payload), state)
        : !Array.isArray(action)
        ? [action]
        : isAction(action)
        ? getResult(
              action[0],
              state,
              isFunc(action[1]) ? action[1](payload) : action[1]
          )
        : action

const makeActionMap = (extract, merge) => {
    let rawMap = actionFn => (
        state,
        data,
        subResult = getResult(actionFn, extract(state), data),
        fullResult = getResult(merge, state, subResult[0])
    ) => [
        fullResult[0],
        ...mapEffects(actualMap, subResult.slice(1)),
        ...fullResult.slice(1),
    ]

    let memoizedMap = actionFn => {
        let mappedAction = memoizedMap.memo.get(actionFn)
        if (!mappedAction) {
            mappedAction = rawMap(actionFn)
            memoizedMap.memo.set(actionFn, mappedAction)
        }
        return mappedAction
    }
    memoizedMap.memo = new Map()
    let actualMap = actionStack => deepMap(memoizedMap, actionStack)
    return actualMap
}

const mapObj = (map, obj) =>
    Object.entries(obj)
        .map(([k, v]) => [k, isAction(v) ? map(v) : v])
        .reduce((o, [k, v]) => ((o[k] = v), o), {})

const mapEffects = (map, effects) =>
    effects.map(([fn, opt]) => [fn, mapObj(map, opt)])

const mapVNode = (map, vnode) =>
    vnode.props
        ? {
              ...vnode,
              props: mapObj(map, vnode.props),
              children: vnode.children.map(child => mapVNode(map, child)),
          }
        : vnode

export default (extract, merge, map = makeActionMap(extract, merge)) => x =>
    isFunc(x)
        ? map(x)
        : Array.isArray(x)
        ? mapEffects(map, x)
        : mapVNode(map, x)
