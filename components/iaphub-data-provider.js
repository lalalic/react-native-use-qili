import React from "react";
import Iaphub from "react-native-iaphub"
import { IaphubDataProvider } from 'react-native-iaphub-ui';

export default function MyIaphubDataProvider({products,...props}) {
    Iaphub.products=products
    React.useEffect(() => () => Iaphub.end?.());
    return <IaphubDataProvider {...{ appId: "A", apiKey: "A", userId: "A",}} {...props} />;
}
