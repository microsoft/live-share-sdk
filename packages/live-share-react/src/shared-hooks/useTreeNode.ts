import { Tree, TreeChangeEvents, TreeNode } from "fluid-framework";
import { IUseTreeNodeResults } from "../types";
import { useEffect, useRef, useState } from "react";
import {
    getRawNode,
    buildProxy,
    setUpListenersForNodeChildren,
} from "./internals/tree-node-utils";

/**
 * Makes a provided Fluid `TreeNode` stateful in React.
 *
 * @param node the Fluid `SharedTree` `TreeNode` instance to make stateful.
 * @param listenerEventName listener type to apply changes for. Default value is "nodeChanged", which has the most optimal performance.
 * Provide "treeChanged" to make all children nodes stateful as well when those child nodes change.
 * When using the default, you must pass all child `TreeNode` values into `useTreeNode` for them to be stateful as well.
 * @returns a stateful version `node`
 */
export function useTreeNode<TNode extends TreeNode | undefined = TreeNode>(
    node: TNode,
    listenerEventName: keyof TreeChangeEvents = "nodeChanged"
): IUseTreeNodeResults<TNode> {
    // When we return a proxied node to a developer, it's possible they will pass it back to us in this hook.
    // We can't listen using Tree.on using a proxy node though...
    // Thus, if we are already listening to a node from another instance of this hook, we look for the unproxied node.
    const rawNode = getRawNode(node);
    const [proxyNode, setProxyNode] = useState<TNode>(rawNode);
    const treeProxyMapRef = useRef<WeakMap<TreeNode, TreeNode>>(new WeakMap());

    useEffect(() => {
        if (!rawNode) return;

        // Set default value
        setProxyNode(rawNode);
        function onNodeChanged() {
            if (!rawNode) return;

            const proxyNode = buildProxy(rawNode, treeProxyMapRef.current);
            setProxyNode(proxyNode);
        }
        // Listen to Fluid's base node from their TreeView so Fluid flex nodes continue to work
        const unsubscribeListeners: (() => void)[] = [
            Tree.on(rawNode, "nodeChanged", onNodeChanged),
        ];
        if (listenerEventName === "treeChanged") {
            // Recursively for all child nodes of this node in the tree
            setUpListenersForNodeChildren(
                rawNode,
                rawNode,
                treeProxyMapRef.current,
                unsubscribeListeners,
                // TODO: fix typing so casting isn't necessary
                setProxyNode as any
            );
        }
        return () => {
            unsubscribeListeners.forEach((unsubscribe) => unsubscribe());
        };
    }, [rawNode, listenerEventName]);

    return {
        node: proxyNode,
    };
}
