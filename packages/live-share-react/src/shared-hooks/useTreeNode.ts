import { Tree, TreeChangeEvents, TreeNode } from "fluid-framework";
import { IUseTreeNodeResults } from "../types";
import { useEffect, useState } from "react";

export function useTreeNode<TNode extends TreeNode | undefined = TreeNode>(
    node: TNode,
    listenerEventName: keyof TreeChangeEvents = "nodeChanged"
): IUseTreeNodeResults<TNode> {
    // When we return a proxied node to a developer, it's possible they will pass it back to us in this hook.
    // We can't listen using Tree.on using a proxy node though...
    // Thus, if we are already listening to a node from another instance of this hook, we look for the unproxied node.
    const rawNode = (isRawNodeGetter(node) ? node[rawTNodeKey] : node) as TNode;
    const [proxyNode, setProxyNode] = useState<TNode>(rawNode);

    useEffect(() => {
        if (!rawNode) return;

        // Set default value
        setProxyNode(rawNode);
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
        };
        function onNodeChanged() {
            if (!rawNode) return;

            setProxyNode((prevValue) => {
                const proxyNode = buildProxy(rawNode, proxyHandler);
                // Force cast because TreeNode can never match TNode due to undefined type in generic
                return proxyNode;
            });
        }
        // Listen to Fluid's base node from their TreeView so Fluid flex nodes continue to work
        const unsubscribe = Tree.on(rawNode, listenerEventName, onNodeChanged);
        return () => {
            unsubscribe();
        };
    }, [rawNode, listenerEventName]);

    return {
        node: proxyNode,
    };
}

const rawTNodeKey = "[[TREE_NODE]]";

interface RawNodeGetter<TNode extends TreeNode | undefined = TreeNode> {
    [rawTNodeKey]: TNode;
}

// Type guard function
function isRawNodeGetter<TNode extends TreeNode | undefined = TreeNode>(
    obj: any
): obj is RawNodeGetter<TNode> {
    return typeof obj === "object" && obj !== null && rawTNodeKey in obj;
}

function buildProxy<TNode extends TreeNode = TreeNode>(
    target: TNode,
    handler: ProxyHandler<TreeNode>
): TNode {
    const proxy = new Proxy(target, handler);
    const proxyWithRaw = proxy as TNode & RawNodeGetter;
    proxyWithRaw[rawTNodeKey] = target;
    return proxyWithRaw;
}
