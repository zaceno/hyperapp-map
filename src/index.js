const isFunc = x => typeof x === 'function'
const isArray = x => Array.isArray(x)
const isAction = action =>
    isFunc(action) || (isArray(action) && isAction(action[0]))

const deepMap = (map, action) =>
    isFunc(action) ? map(action) : [deepMap(map, action[0]), action[1]]

const getResult = (action, state, payload) =>
    isFunc(action)
        ? getResult(action(state, payload), state)
        : !isArray(action)
        ? [action]
        : isAction(action)
        ? getResult(
              action[0],
              state,
              isFunc(action[1]) ? action[1](payload) : action[1]
          )
        : action

export const makeMap = (extract, merge) => {
    let rawMap = actionFn => (
        state,
        data,
        subResult = getResult(actionFn, extract(state), data),
        fullResult = getResult(merge, state, subResult[0])
    ) => [
        fullResult[0],
        ...mapSubs(actualMap, subResult.slice(1)),
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

const mapObj = (map, obj, fn) =>
    Object.entries(obj)
        .map(([k, v]) => [k, fn(k, v)])
        .reduce((o, [k, v]) => ((o[k] = v), o), {})

const mapEach = f => (map, x) =>
    isArray(x) ? x.map(y => f(map, y)) : f(map, x)

export const mapSubs = mapEach((map, [fn, opt]) => [
    fn,
    mapObj(map, opt, (k, v) => (isAction(v) ? map(v) : v)),
])

export const mapVNode = mapEach((map, vnode) =>
    vnode.props
        ? {
              ...vnode,
              props: mapObj(map, vnode.props, (k, v) =>
                  !v ? v : !k.startsWith('on') ? v : v.pass ? v.pass : map(v)
              ),
              children: vnode.children.map(child => mapVNode(map, child)),
          }
        : vnode
)

export const mapPass = x => mapVNode(pass => ({ pass }), x)
