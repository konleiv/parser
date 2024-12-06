type Nothing = { type: 'nothing' };
type Just<T> = { type: 'just', val: T };
export type Maybe<T> = Nothing | Just<T>;

export const nothing: Nothing = { type: 'nothing' };

export function maybeBind<Q,R>(mq: Maybe<Q>, f: (q: Q) => Maybe<R>): Maybe<R> {
    if (mq.type === 'nothing') {
        return nothing;
    } else {
        return f(mq.val);
    }
}

export function maybeWrap<T>(t: T): Just<T> {
    return {
        type: 'just',
        val: t
    };
}