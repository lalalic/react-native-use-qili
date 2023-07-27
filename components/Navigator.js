import React from "react";
import { View } from "react-native"
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Link, Outlet, useLocation } from "react-router-native";

export default function Navigator({root="", height=50, navs=[]}){
    const {pathname}=useLocation()
    return (
        <View style={{ flex: 1, paddingBottom:height }}>
            <Outlet />
            <View style={{ flexDirection: "row", justifyContent: "space-around",
                    position: "absolute", bottom:0, left: 0, width: "100%",height 
                    }}>
                {navs.map(([href, name, to=`${root}${href}`], i) => {
                    return (
                        <Link key={i} to={to} style={{ flex: 1, alignItems: "center", padding: 10 }}>
                            <MaterialIcons name={name} color={pathname.startsWith(to) ? "yellow" : "white"} />
                        </Link>
                    );
                })}
            </View>
        </View>
    )
}
