## KR001 Scene Setup via MCP
## Creates the full node hierarchy for KR001.scene

$mcpUrl = "http://localhost:3000/mcp"
$id = 0

function Invoke-MCP($toolName, $arguments) {
    $script:id++
    $body = @{
        jsonrpc = "2.0"
        id = $script:id
        method = "tools/call"
        params = @{
            name = $toolName
            arguments = $arguments
        }
    } | ConvertTo-Json -Depth 10 -Compress
    
    $response = Invoke-WebRequest -Uri $mcpUrl -Method POST -ContentType "application/json" -Body $body -TimeoutSec 15
    $result = ($response.Content | ConvertFrom-Json).result.content[0].text | ConvertFrom-Json
    return $result
}

# Get scene UUID
$hierarchy = Invoke-MCP "scene_scene_hierarchy" @{ includeComponents = $false }
$sceneUuid = $hierarchy.data.uuid
Write-Host "Scene UUID: $sceneUuid"

# 1. Create Canvas node (2D with UITransform)
Write-Host "`n--- Creating Canvas ---"
$canvas = Invoke-MCP "node_node_lifecycle" @{
    action = "create"
    name = "Canvas"
    nodeType = "2DNode"
    components = @("cc.Canvas", "cc.Widget")
}
$canvasUuid = $canvas.data.uuid
Write-Host "Canvas UUID: $canvasUuid"

# 2. Create Main Camera under Canvas
Write-Host "`n--- Creating Main Camera ---"
$camera = Invoke-MCP "node_node_lifecycle" @{
    action = "create"
    name = "Main Camera"
    nodeType = "2DNode"
    parentUuid = $canvasUuid
    components = @("cc.Camera")
}
$cameraUuid = $camera.data.uuid
Write-Host "Camera UUID: $cameraUuid"

# 3. Create MapRoot under Canvas
Write-Host "`n--- Creating MapRoot ---"
$mapRoot = Invoke-MCP "node_node_lifecycle" @{
    action = "create"
    name = "MapRoot"
    nodeType = "2DNode"
    parentUuid = $canvasUuid
}
$mapRootUuid = $mapRoot.data.uuid
Write-Host "MapRoot UUID: $mapRootUuid"

# 4. Create LevelMap under MapRoot (with Sprite)
Write-Host "`n--- Creating LevelMap ---"
$levelMap = Invoke-MCP "node_node_lifecycle" @{
    action = "create"
    name = "LevelMap"
    nodeType = "2DNode"
    parentUuid = $mapRootUuid
    components = @("cc.Sprite")
}
$levelMapUuid = $levelMap.data.uuid
Write-Host "LevelMap UUID: $levelMapUuid"

# 5. Create EnemyRoot under Canvas
Write-Host "`n--- Creating EnemyRoot ---"
$enemyRoot = Invoke-MCP "node_node_lifecycle" @{
    action = "create"
    name = "EnemyRoot"
    nodeType = "2DNode"
    parentUuid = $canvasUuid
}
$enemyRootUuid = $enemyRoot.data.uuid
Write-Host "EnemyRoot UUID: $enemyRootUuid"

# 6. Create DebugRoot under Canvas
Write-Host "`n--- Creating DebugRoot ---"
$debugRoot = Invoke-MCP "node_node_lifecycle" @{
    action = "create"
    name = "DebugRoot"
    nodeType = "2DNode"
    parentUuid = $canvasUuid
}
$debugRootUuid = $debugRoot.data.uuid
Write-Host "DebugRoot UUID: $debugRootUuid"

# 7. Attach KR001SceneSetup script to Canvas
Write-Host "`n--- Attaching Scripts ---"
$attachSetup = Invoke-MCP "node_node_script_management" @{
    action = "attach"
    nodeUuid = $canvasUuid
    scriptName = "KR001SceneSetup"
}
Write-Host "KR001SceneSetup attached: $($attachSetup.success)"

# 8. Attach KR001MapLoader script to LevelMap
$attachMap = Invoke-MCP "node_node_script_management" @{
    action = "attach"
    nodeUuid = $levelMapUuid
    scriptName = "KR001MapLoader"
}
Write-Host "KR001MapLoader attached: $($attachMap.success)"

# 9. Attach KR001EnemySpawner script to EnemyRoot
$attachSpawner = Invoke-MCP "node_node_script_management" @{
    action = "attach"
    nodeUuid = $enemyRootUuid
    scriptName = "KR001EnemySpawner"
}
Write-Host "KR001EnemySpawner attached: $($attachSpawner.success)"

# 10. Save scene
Write-Host "`n--- Saving Scene ---"
$save = Invoke-MCP "scene_scene_management" @{ action = "save" }
Write-Host "Scene saved: $($save.success)"

# 11. Print final hierarchy
Write-Host "`n--- Final Hierarchy ---"
$finalHierarchy = Invoke-MCP "scene_scene_hierarchy" @{ includeComponents = $true }
$finalHierarchy.data | ConvertTo-Json -Depth 5

Write-Host "`n=== KR001 Scene Setup Complete ==="
