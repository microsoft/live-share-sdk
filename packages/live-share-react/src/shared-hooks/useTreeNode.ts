import { Tree, TreeChangeEvents, TreeNode } from "fluid-framework";
import { IUseTreeNodeResults } from "../types";
import { useEffect, useState } from "react";

const proxyMap: WeakMap<TreeNode, TreeNode> = new WeakMap();

export function useTreeNode<TNode extends TreeNode | undefined = TreeNode>(
    node: TNode,
    listenerEventName: keyof TreeChangeEvents = "nodeChanged"
): IUseTreeNodeResults<TNode> {
    const [proxyNode, setProxyNode] = useState<TNode>(
        ((node ? proxyMap.get(node) : undefined) ?? node) as TNode
    );

    useEffect(() => {
        if (!node) return;
        // TODO: this is hacky, let's see if this is possible to avoid...
        // When we return a proxied node to a developer, it's possible they will pass it back to us in this hook.
        // We can't listen using Tree.on using a proxy node though...
        // Thus, if we are already listening to a node from another instance of this hook, we look for the unproxied node.
        const rawNode = proxyMap.get(node) ?? node;
        // Set default value
        setProxyNode(rawNode as TNode);
        const proxyHandler: ProxyHandler<TreeNode> = {
            get: (target, prop, receiver) => {
                // pass in the rawNode so Fluid doesn't get confused by our proxy object and can find the flex node
                const value = Reflect.get(target, prop, rawNode);
                return typeof value === "function"
                    ? value.bind(rawNode)
                    : value;
            },
            set: (target, prop, value) => {
                return Reflect.set(target, prop, value);
            },
            has: (target, prop) => {
                return Reflect.has(target, prop);
            },
            ownKeys: (target) => {
                return Reflect.ownKeys(target);
            },
            getOwnPropertyDescriptor: (target, viewKeys) => {
                return Reflect.getOwnPropertyDescriptor(target, viewKeys);
            },
            getPrototypeOf: (target) => {
                return Reflect.getPrototypeOf(target);
            },
            setPrototypeOf: (target, v) => {
                return Reflect.setPrototypeOf(target, v);
            },
            // apply: (target, thisArg, argArray) => {
            //     return Reflect.apply( thisArg, argArray);
            // },
        };
        function onNodeChanged() {
            if (!node) return;

            setProxyNode((prevValue) => {
                proxyMap.delete(node);
                const proxyNode = new Proxy(node, proxyHandler);
                proxyMap.set(proxyNode, rawNode!);
                // Force cast because TreeNode can never match TNode due to undefined type in generic
                return proxyNode as TNode;
            });
        }
        // Listen to Fluid's base node from their TreeView so Fluid flex nodes continue to work
        const unsubscribe = Tree.on(rawNode, listenerEventName, onNodeChanged);
        return () => {
            unsubscribe();
        };
    }, [node, listenerEventName]);

    return {
        node: proxyNode,
    };
}
