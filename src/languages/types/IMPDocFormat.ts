interface IMPDocFormat {
    // function ID, comment, or EMPTY
    header: string | undefined

    /**
     *  string[] = [comment1, comment2, ..., comments]
     *       #> example1
     *       # comment1
     *       # comment2
     *       # ...
     *       # comments
     * -------------------------
     *  ((one of Annotations): string[])[] = [{ within: 'ns:f/fn' }]
     *       #> example2
     *       # @within ns:f/fn
     */
    // internal?: (Record<Annotations, string | string[]> | string)[]
    internal?: (ElmAnno | string)[]
}

type Annotations
    = 'user'
    | 'public'
    | 'api'
    | 'context'
    | 'within'
    | 'handles'
    | 'patch'
    | 'input'
    | 'output'
    | 'reads'
    | 'writes';

type ElmAnno = {[L in Annotations]?: string};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _test: IMPDocFormat = {header: '', internal: [{within: 'ns:f/fn'}]};