import React from 'react';
import {TailSpin} from 'react-loader-spinner';

const Loading = ({width}) => {
    return <TailSpin
        // visible={{ture}}
        wrapperClass='sub-root-relative-center'
        width={width}
        color='#4fa94d'
        ariaLabel="tail-spin-loading"
        radius="1"
        // wrapperStyle={{}}
        // wrapperClass=""
    />
};

export default Loading;