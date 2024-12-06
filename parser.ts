import { Maybe, maybeBind, maybeWrap, nothing } from './maybe';

type Parser<T> = (s: string) => Maybe<[T, string]>;

export function result<T>(t: T): Parser<T> {
    return (s: string) => {
        return maybeWrap([t,s]);
    }
}

export const digit: Parser<number> = (s: string) => {
    if (s.length === 0) {
        return nothing;
    } else if (Number(s[0])) {
        return maybeWrap([Number(s[0]),s.slice(1)]);
    } else {
        return nothing;
    }
};

export function char(c: string): Parser<string> {
    return (s: string) => {
        if (s.length === 0) {
            return nothing;
        } else if (c === s[0]) {
            return maybeWrap([s[0],s.slice(1)]);
        } else {
            return nothing;
        }
    }
}

export function parserBind<Q,R>(pq: Parser<Q>, f: (q: Q) => Parser<R>): Parser<R> {
    return (s: string) => {
        const r1 = pq(s);
        return maybeBind(r1, (res) => {
            const [v,inp] = res;
            return f(v)(inp);
        })
    }
}

export function or<Q,R>(pq: Parser<Q>, pr: Parser<R>): Parser<Q|R> {
    return (s: string) => {
        const resq = pq(s);
        if (resq.type === 'nothing') {
            return pr(s);
        } else {
            return resq;
        }
    };
}

export function many<T>(p: Parser<T>): Parser<T[]> {
    return parserBind(p, (valp) => {
        const q = many(p);
        return (s: string) => {
            const res = q(s);
            if (res.type === 'nothing') {
                return maybeWrap([[valp],s]);
            } else {
                return maybeBind(res, (valq) => {
                    const [v,inp] = valq;
                    return maybeWrap([[valp].concat(v),inp]);
                })
            }
        }
    })
}

export function parserMap<Q,R>(p: Parser<Q>, f: (q: Q) => R): Parser<R> {
    return parserBind(p, (q) => {
        return result(f(q));
    });
}

export function text(st: string): Parser<string> {
    if (st.length === 0) {
        return result('');
    } else {
        const p = char(st[0]);
        return parserBind(p, (x) => {
            const q = text(st.slice(1));
            return parserBind(q, (y) => {
                return result(x+y);
            })
        })
    }
}

export function chain<A,B,C,D,E>(
    pa: Parser<A>,
    pb: Parser<B>,
    pc: Parser<C>,
    pd: Parser<D>,
    pe: Parser<E>,
): Parser<[A,B,C,D,E]> {
    return parserBind(pa, (a) => {
        return parserBind(pb, (b) => {
            return parserBind(pc, (c) => {
                return parserBind(pd, (d) => {
                    return parserBind(pe, (e) => {
                        return result([a,b,c,d,e]);
                    });
                });
            });
        });
    });
}

// example

type AddOp = string;
type SubOp = string;
type MulOp = string;
type DivOp = string;
type ExpOp = string;
type Lp = string;
type Rp = string;

type Literal = number;
type Var = string;
type Add = [Lp,Expr,AddOp,Expr,Rp];
type Sub = [Lp,Expr,SubOp,Expr,Rp];
type Mul = [Lp,Expr,MulOp,Expr,Rp];
type Div = [Lp,Expr,DivOp,Expr,Rp];
type Exp = [Lp,Expr,ExpOp,Expr,Rp];
type Expr = Literal | Var | Add | Sub | Mul | Div | Exp;



const item1Parser: Parser<Var> = text("item1");
const item2Parser: Parser<Var> = text("item2");

const addOpParser: Parser<AddOp> = char('+');
const subOpParser: Parser<SubOp> = char('-');
const mulOpParser : Parser<MulOp> = char('*');
const divOpParser : Parser<DivOp> = char('/');
const expOpParser : Parser<ExpOp> = char('^');
const lpParser : Parser<Lp> = char('(');
const rpParser : Parser<Rp> = char(')');

const literalParser: Parser<Literal> = or(parserBind(many(digit), (x) => {
    return parserBind(char('.'), (y) => {
        return parserBind(many(digit), (z) => {
            const [i,j,k] = [x,y,z];
            const a = i.map(String).join('');
            const c = k.map(String).join('');
            return result(Number(a+j+c));
        })
    })
}), parserBind(many(digit), (x) => {
    return result(Number(x.map(String).join('')));
}));

const varParser: Parser<Var> = or(item1Parser, item2Parser);
const addParser: Parser<Add> = chain(lpParser,exprParser,addOpParser,exprParser,rpParser);
const subParser: Parser<Sub> = chain(lpParser,exprParser,subOpParser,exprParser,rpParser);
const mulParser: Parser<Mul> = chain(lpParser,exprParser,mulOpParser,exprParser,rpParser);
const divParser: Parser<Div> = chain(lpParser,exprParser,divOpParser,exprParser,rpParser);
const expParser: Parser<Exp> = chain(lpParser,exprParser,expOpParser,exprParser,rpParser);
function exprParser(s: string) {
    return or(
        literalParser,or(
            varParser,or(
                addParser,or(
                    subParser,or(
                        mulParser,or(
                            divParser,expParser
                        )
                    )
                )
            )
        )
    )(s)};

console.log(exprParser("(2+item1)"));
console.log(exprParser("(((item1^2)+(item2^6))/(12-2))"));
console.log(exprParser("(((item1^)+(item2^6))/(12-2))"));
console.log(exprParser("((item1^)+(item2^6))/(12-2))"));
console.log(exprParser("(((item1^2)+(item2^6))/(12-2))"));
console.log(exprParser("(((item1^2)(item2^6))/(12-2))"));
console.log(exprParser("(((itm1^2)+(item2^6))/(12-2))"));