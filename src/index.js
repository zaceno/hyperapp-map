const MEMO = []

const isFunc = x => typeof x === 'function'

const mapSub = (M, [fn, props]) => {
    let result = MEMO.filter(
        ([f, p, r]) => f === fn && shallowEqual(props, p)
    ).reduce((_, [f, p, r]) => r, null)

    if (!result) {
        result = mapEffect(M, [fn, props])
        MEMO.push([fn, props, result])
    }
    return result
}

const mapObj = (o, f) =>
    Object.entries(o)
        .map(([k, v]) => [k, f(k, v)])
        .reduce((o, [k, v]) => ((o[k] = v), o), {})

const shallowEqual = (a, b, keys = Object.keys(a)) =>
    keys.length !== Object.keys(b).length
        ? false
        : keys.reduce((eq, k) => eq && a[k] === b[k], true)

const isAction = x => isFunc(x) || (Array.isArray(x) && isAction(x[0]))

const mapEffect = (M, [fn, props]) => [
    fn,
    mapObj(props, (k, v) => (isAction(v) ? M(v) : v)),
]

const makeActionMap = (extract, merge) =>
    function actionMap(action) {
        return (state, data) =>
            (function resolve(x, state, data) {
                return isFunc(x)
                    ? resolve(x(extract(state), data), state)
                    : !Array.isArray(x)
                    ? merge(state, x)
                    : !isAction(x[0])
                    ? [
                          merge(state, x[0]),
                          ...x.slice(1).map(f => mapEffect(actionMap, f)),
                      ]
                    : isFunc(x[1])
                    ? resolve(x[0], state, x[1](data))
                    : resolve(x[0], state, x[1])
            })(action, state, data)
    }

const mapVNode = (M, vnode) => ({
    ...vnode,
    props: mapObj(vnode.props, (key, val) =>
        key.startsWith('on') ? M(val) : val
    ),
    children: vnode.children.map(child => mapVNode(M, child)),
})

export default (extract, merge, x, M = makeActionMap(extract, merge)) =>
    isFunc(x)
        ? M(x)
        : Array.isArray(x)
        ? x.map(sub => mapSub(M, sub))
        : mapVNode(M, x)
