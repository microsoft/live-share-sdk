export async function joinTinyliciousClient(client, containerSchema) {
    if (window.location.hash) {
      // Load existing container
      const id = window.location.hash.substring(1);
      return client.getContainer(id, containerSchema);
    } else {
      // Create a new container
      const results = await client.createContainer(containerSchema);
      const containerId = await results.container.attach();
      window.location.hash = containerId;
      return results;
    }
}