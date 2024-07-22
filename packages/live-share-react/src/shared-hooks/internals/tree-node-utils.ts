import { proxiedChildrenKey, rawTNodeKey } from "./tree-node-constants";
import {
    ICustomProxyHandler,
    isCustomProxyHandler,
    isTreeNode,
    isProxy,
} from "./tree-node-types";
import { TreeNode, Tree } from "fluid-framework";
import { Dispatch, SetStateAction } from "react";

// Exported utils

/**
 * @internal
 * Build a proxied version of a node and set its value to the treeMap provided
 *
 * @param rawNode the raw proxy node exposed by Fluid
 * @param treeMap a map where Fluid's proxy node is mapped to our proxied node
 * @returns TNode instance
 */
export function buildProxy<TNode extends TreeNode = TreeNode>(
    rawNode: TNode,
    treeMap: WeakMap<TreeNode, TreeNode>
): TNode {
    const previousProxy = treeMap.get(rawNode);
    const previousProxyHandler = previousProxy
        ? getCustomProxyHandler(previousProxy)
        : undefined;
    const proxyHandler: ProxyHandler<TreeNode> & ICustomProxyHandler<TNode> = {
        // Add some extra stuff into the handler so we can store the original Fluid TreeNode and access it later
        // Without overriding the rest of the getters in the object.
        [rawTNodeKey]: rawNode,
        [proxiedChildrenKey]: previousProxyHandler?.[proxiedChildrenKey] ?? {},
        get: (target, prop, _) => {
            if (prop === "[[Handler]]") {
                return proxyHandler;
            }
            if (
                typeof prop === "string" &&
                proxyHandler[proxiedChildrenKey][prop]
            ) {
                return proxyHandler[proxiedChildrenKey][prop];
            }
            // pass in the rawNode so Fluid doesn't get confused by our proxy object and can find the flex node
            const value = Reflect.get(target, prop, rawNode);
            return typeof value === "function" &&
                typeof prop === "string" &&
                // TODO: need a better way of identifying which types of functions need to be proxied
                // This is because if a developer uses an array prototype function, we need to return proxied
                // objects so React can detect changes to those nodes...
                !["map", "flatMap", "filter", "find", "indexOf"].includes(prop)
                ? value.bind(rawNode)
                : value;
        },
        set(target, p, newValue, _) {
            return Reflect.set(target, p, newValue, rawNode);
        },
    };
    const proxy = new Proxy(rawNode, proxyHandler);
    // Track the proxy for the rawNode
    treeMap.set(rawNode, proxy);
    // Set raw node getter so we can access it before things like Tree.on
    return proxy as TNode;
}

/**
 * @internal
 * Set up listeners for a given TreeNode.
 * Will recursively call this function for all children nodes of each children until there are no more child nodes.
 *
 * @param parentRawNode raw parent node
 * @param rootNodeForListener root node being listened to in useTreeNode
 * @param treeMap a map where Fluid's proxy node is mapped to our proxied node
 * @param unsubscribeListeners list of unsubscribe listeners, where we set the unsubscribe callbacks
 * @param setProxyNode setter to set the root proxy node listened to in useTreeNode
 */
export function setUpListenersForNodeChildren<
    TNode extends TreeNode = TreeNode,
>(
    parentRawNode: TreeNode,
    rootNodeForListener: TreeNode,
    treeMap: WeakMap<TreeNode, TreeNode>,
    unsubscribeListeners: (() => void)[],
    setProxyNode: Dispatch<SetStateAction<TNode>>
) {
    let entries = Object.entries(parentRawNode);
    for (let i = 0; i < entries.length; i++) {
        const [key, entry] = entries[i];
        if (
            !entry ||
            ["string", "boolean", "number", "function"].includes(
                typeof entry
            ) ||
            !isTreeNode(entry)
        ) {
            continue;
        }
        const rawEntry = getRawNode(entry);
        const onNodeChanged = () => {
            onTreeNodeChanged(
                key,
                rawEntry,
                rootNodeForListener,
                treeMap,
                setProxyNode
            );
        };
        const unsubscribe = Tree.on(rawEntry, "nodeChanged", onNodeChanged);
        unsubscribeListeners.push(unsubscribe);
        // Recursively listen to children nodes of this node
        setUpListenersForNodeChildren(
            rawEntry,
            rootNodeForListener,
            treeMap,
            unsubscribeListeners,
            setProxyNode
        );
    }
}

/**
 * @internal
 * Fluid only knows how to work with their proxied version of a TreeNode.
 * We store a reference to that node in our proxied instances so we can easily use it when working with Fluid APIs.
 *
 * @param node get the raw node from the proxy
 * @returns the raw proxied node that Fluid expects
 */
export function getRawNode<TNode extends TreeNode | undefined = TreeNode>(
    node: TNode
): TNode {
    if (isProxy(node)) {
        return getRawNodeFromProxy(node) as TNode;
    }
    return node;
}

// Non public utils

/**
 * Callback for when a tree node changed
 *
 * @param key key where the object is stored in the parent
 * @param rawNode the raw node that changed
 * @param rootNodeForListener the root node that is being listened to in useTreeNode
 * @param treeMap a map where Fluid's proxy node is mapped to our proxied node
 * @param setProxyNode setter to set the root proxy node listened to in useTreeNode
 */
function onTreeNodeChanged<TNode extends TreeNode = TreeNode>(
    key: string,
    rawNode: TreeNode,
    rootNodeForListener: TreeNode,
    treeMap: WeakMap<TreeNode, TreeNode>,
    setProxyNode: Dispatch<SetStateAction<TNode>>
) {
    const proxyNode = buildProxy(rawNode, treeMap);
    const parent = Tree.parent(rawNode);
    if (!parent) {
        throw new Error(
            "useTreeNode onTreeNodeChanged: no parent found for rawParentNode"
        );
    }

    proxyParentForNode(
        key,
        parent,
        proxyNode,
        rootNodeForListener,
        treeMap,
        setProxyNode
    );
}

/**
 * Proxies the parent and sets reference to the child node that changed.
 *
 * @param key key where the object is referenced in its parent node
 * @param rawParentNode raw parent tree node
 * @param proxyNode proxied instance of the node that changed
 * @param rootNodeForListener root node listened to in useTreeNode
 * @param treeMap a map where Fluid's proxy node is mapped to our proxied node
 * @param setProxyNode setter to set the root proxy node listened to in useTreeNode
 */
function proxyParentForNode<TNode extends TreeNode = TreeNode>(
    key: string,
    rawParentNode: TreeNode,
    proxyNode: TreeNode,
    rootNodeForListener: TreeNode,
    treeMap: WeakMap<TreeNode, TreeNode>,
    setProxyNode: Dispatch<SetStateAction<TNode>>
) {
    const parentProxy = buildProxy(rawParentNode, treeMap);
    let parentProxyHandler = getCustomProxyHandler(parentProxy);
    if (!parentProxyHandler) {
        throw new Error(
            "useTreeNode proxyParentForNode: unexpected error, should always find valid proxy handler"
        );
    }
    parentProxyHandler[proxiedChildrenKey][key] = proxyNode;
    if (rawParentNode === rootNodeForListener) {
        setProxyNode(parentProxy as TNode);
    } else {
        const parentOfParent = Tree.parent(rawParentNode);
        if (!parentOfParent) {
            throw new Error(
                "useTreeNode proxyParentForNode: no parent found for rawParentNode"
            );
        }
        const parentKey = findKeyOfNode(rawParentNode, parentOfParent);
        proxyParentForNode(
            parentKey,
            parentOfParent,
            parentProxy,
            rootNodeForListener,
            treeMap,
            setProxyNode
        );
    }
}

/**
 * Returns key where parent[key] == nodeToCheck
 *
 * @param nodeToCheck tree node to check
 * @param parent parent node where nodeToCheck is a child of
 * @returns the key for node
 */
function findKeyOfNode(nodeToCheck: TreeNode, parent: TreeNode): string {
    let entries = Object.entries(parent);
    for (let i = 0; i < entries.length; i++) {
        const [key, entry] = entries[i];
        if (
            !entry ||
            ["string", "boolean", "number", "function"].includes(
                typeof entry
            ) ||
            !isTreeNode(entry)
        ) {
            continue;
        }
        if (entry === nodeToCheck) return key;
    }
    throw new Error("Did not find node as a child of parent");
}

// Type utils

/**
 * Gets the proxy handler for a given TreeNode, assuming `isCustomProxyHandler` returns true.
 * @param proxy the proxied TreeNode to get the handler for.
 * @returns the handler if valid, otherwise undefined
 */
function getCustomProxyHandler(proxy: TreeNode) {
    const handler = (proxy as any)["[[Handler]]"];
    if (isCustomProxyHandler(handler)) {
        return handler;
    }
    return undefined;
}

/**
 * Gets the raw node for a given proxied tree node
 *
 * @param proxy the proxied TreeNode to get the raw node for
 * @returns the raw node if valid, otherwise undefined
 */
function getRawNodeFromProxy(proxy: TreeNode) {
    return getCustomProxyHandler(proxy)?.[rawTNodeKey];
}
