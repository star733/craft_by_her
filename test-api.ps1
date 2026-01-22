try {
    Write-Host "`n🔍 Testing /api/hubs/test-public endpoint...`n" -ForegroundColor Cyan
    
    $response = Invoke-WebRequest -Uri "http://localhost:5000/api/hubs/test-public" -Method GET -UseBasicParsing
    
    Write-Host "✅ STATUS: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "📦 RESPONSE:" -ForegroundColor Yellow
    Write-Host $response.Content
    
} catch {
    Write-Host "❌ ERROR: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "📦 ERROR RESPONSE:" -ForegroundColor Yellow
        Write-Host $responseBody
    }
}
