import React from 'react';


export default function useStateAndLatest(value) {
    const [a, setA] = React.useState(value);
    const $a = React.useRef(a);
    $a.current = a;
    return [a, setA, $a];
}
