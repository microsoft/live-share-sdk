import {
    ImplicitFieldSchema,
    TreeViewConfiguration,
    SharedTree,
    TreeView,
    ITree,
    InsertableTreeFieldFromImplicitField,
    TreeFieldFromImplicitField,
} from "fluid-framework";
import { IUseSharedTreeResults } from "../types/index.js";
import { useDynamicDDS, useTreeNode } from "../shared-hooks/index.js";
import React from "react";

/**
 * Creates a new Fluid `SharedTree` instance if one doesn't already exist.
 * @remarks
 * Use the `root` variable from the {@link IUseSharedTreeResults} response from this hook with {@link useTreeNode}.
 * This makes `root` stateful with React whenever a leaf of `root` changes.
 *
 * @param uniqueKey the unique key for the `SharedTree`. If one does not yet exist, a new `SharedTree` will be created.
 * Otherwise it will use the existing one.
 * @param treeViewConfiguration the tree view configuration that contains the `SharedTree` field schema.
 * @param initialData the initial data to load into the `SharedTree` when it is first created.
 * @returns the {@link IUseSharedTreeResults} with the `root` node.
 *
 * @example
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
 */
export function useSharedTree<
    TSchema extends ImplicitFieldSchema = ImplicitFieldSchema,
>(
    uniqueKey: string,
    treeViewConfiguration: TreeViewConfiguration<TSchema>,
    initialData: InsertableTreeFieldFromImplicitField<TSchema>
): IUseSharedTreeResults<TSchema> {
    const [treeView, setTreeView] = React.useState<TreeView<TSchema>>();
    const [root, setRoot] =
        React.useState<TreeFieldFromImplicitField<TSchema>>();

    const onFirstInitialize = React.useCallback(
        (newDDS: ITree): void => {
            try {
                // Create a `treeView` with the provided `treeViewConfiguration`
                const _treeView = newDDS.viewWith(treeViewConfiguration);
                if (_treeView.compatibility.canInitialize) {
                    // Set initial data
                    _treeView.initialize(initialData);
                }
                // `onFirstInitialize` is only called for the user that created the tree, but we need this object for all clients.
                // Dispose, since we will call `sharedTree.viewWith` in a `useEffect` down below and set it to state.
                _treeView.dispose();
            } catch (err) {
                console.error(err);
            }
        },
        [treeViewConfiguration, initialData]
    );
    /**
     * User facing: dynamically load the `SharedTree` DDS for the given unique key.
     */
    const { dds: sharedTree } = useDynamicDDS<ITree>(
        uniqueKey,
        SharedTree,
        onFirstInitialize
    );

    /**
     * Sets the tree view and root view
     */
    React.useEffect(() => {
        if (!sharedTree) return;
        let _treeView: TreeView<TSchema> | undefined = undefined;
        try {
            // Create a `treeView` with the provided `treeViewConfiguration`
            _treeView = sharedTree.viewWith(treeViewConfiguration);
            setTreeView(_treeView);
        } catch (err) {
            console.error(err);
        }

        // Listen for changes to root view
        const updateRoot = (): void => {
            if (_treeView?.compatibility.canView) {
                setRoot(_treeView.root);
            } else {
                setRoot(undefined);
            }
        };

        updateRoot();
        const unsubscribeToRoot = _treeView?.events.on(
            "rootChanged",
            updateRoot
        );
        return () => {
            _treeView?.dispose();
            unsubscribeToRoot?.();
        };
    }, [sharedTree, treeViewConfiguration]);

    return {
        treeView,
        sharedTree,
        root,
    };
}
