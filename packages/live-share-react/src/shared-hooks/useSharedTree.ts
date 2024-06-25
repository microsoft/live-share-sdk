import {
    ImplicitFieldSchema,
    TreeViewConfiguration,
    SharedTree,
    TreeView,
    ITree,
    InsertableTreeFieldFromImplicitField,
} from "fluid-framework";
import { IUseSharedTreeResults } from "../types";
import { useDynamicDDS } from "../shared-hooks";
import React from "react";

export function useSharedTree<
    TSchema extends ImplicitFieldSchema = ImplicitFieldSchema
>(
    uniqueKey: string,
    treeViewConfiguration: TreeViewConfiguration<TSchema>,
    initialData: InsertableTreeFieldFromImplicitField<TSchema>
): IUseSharedTreeResults<TSchema> {
    const [treeView, setTreeView] = React.useState<TreeView<TSchema>>();
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
     * Sets the tree view
     */
    React.useEffect(() => {
        if (!sharedTree) return;
        try {
            // Create a `treeView` with the provided `treeViewConfiguration`
            const _treeView = sharedTree.viewWith(treeViewConfiguration);
            setTreeView(_treeView);
        } catch (err) {
            console.error(err);
        }
    }, [sharedTree, treeViewConfiguration]);

    return {
        treeView,
        sharedTree,
    };
}
