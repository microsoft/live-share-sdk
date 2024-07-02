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
 * @param stateChangeType listener type to apply changes for. Default value is "nodeChanged", which has the most optimal performance.
 * Provide "treeChanged" to make all children nodes stateful as well when those child nodes change.
 * When using the default, you must pass all child `TreeNode` values into `useTreeNode` for them to be stateful as well.
 * @returns a stateful version `node`
 *
 * @example
 * Example using default `"nodeChanged"` `stateChangeType`
 * ```tsx
 * import { SchemaFactory, TreeViewConfiguration } from "fluid-framework";
 * import { useSharedTree, useTreeNode } from "@microsoft/live-share-react";
 * // Declare a schema factory with your unique uuid
 * const sf = new SchemaFactory("fc1db2e8-0000-11ee-be57-0242ac120002");
 * class YourObject extends sf.object("YourObject", {
 *  listChangedCount: sf.number,
 *  list: sf.array(sf.string),
 * }) {
 *  // You can add your own utility functions
 *  insert() {
 *      this.list.insertAtEnd("some text");
 *      this.listChangedCount += 1;
 *  }
 * }
 * const config = new TreeViewConfiguration({ schema: YourObject });
 * const initialData = new YourObject({
 *  number: 0,
 *  list: [],
 * });
 *
 * // Must be child component of <LiveShareProvider> or <AzureProvider>
 * export const YourComponent = () => {
 *  // Get the root node of the `SharedTree` mapped to "some-unique-key"
 *  const { root } = useSharedTree("some-unique-key", config, initialData);
 *  // Makes root stateful / automatically update when the node changes (e.g., node.count)
 *  const { node } = useTreeNode(root);
 *  // node.list is its own TreeNode, so we make it stateful as well
 *  const { node: list } = useTreeNode(node?.list);
 *  if (!node || !list) return (<>"Loading"</>);
 *  return (
 *      <div>
 *          <div>Changed: {node.listChangedCount}</div>
 *          <button onClick={() => node.insert()}>Insert</button>
 *          { list.map((item) => <div key={item}>{item}</div>) }
 *      </div>
 *  );
 * }
 * ```
 *
 * @example
 * Example using `"treeChanged"` `stateChangeType`
 * ```tsx
 * import { SchemaFactory, TreeViewConfiguration } from "fluid-framework";
 * import { useSharedTree, useTreeNode } from "@microsoft/live-share-react";
 * // Declare a schema factory with your unique uuid
 * const sf = new SchemaFactory("fc1db2e8-0000-11ee-be57-0242ac120002");
 *
 * class ChildObject extends sf.object("ChildObject", {
 *  count: sf.number,
 * }) {
 *  increment() {
 *      this.count += 1;
 *  }
 * }
 *
 * class YourObject extends sf.object("YourObject", {
 *  child: ChildObject,
 * }) {}
 * const config = new TreeViewConfiguration({ schema: YourObject });
 * const initialData = new YourObject({
 *  child: new ChildObject({ count: 0 }),
 * });
 *
 * // Must be child component of <LiveShareProvider> or <AzureProvider>
 * export const YourComponent = () => {
 *  // Get the root node of the `SharedTree` mapped to "some-unique-key"
 *  const { root } = useSharedTree("some-unique-key", config, initialData);
 *  // Using "treeChanged" prop makes all children nodes stateful as well.
 *  // Use with caution / measure render performance with React dev tools.
 *  const { node } = useTreeNode(root, "treeChanged");
 *  if (!node) return (<>"Loading"</>);
 *  return (
 *      <div>
 *          <div>Changed: {node.child.count}</div>
 *          <button onClick={() => node.increment()}>Insert</button>
 *      </div>
 *  );
 * }
 * ```
 */
export function useTreeNode<TNode extends TreeNode | undefined = TreeNode>(
    node: TNode,
    stateChangeType: keyof TreeChangeEvents = "nodeChanged"
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
        if (stateChangeType === "treeChanged") {
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
    }, [rawNode, stateChangeType]);

    return {
        node: proxyNode,
    };
}
