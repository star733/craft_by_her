$body = '{"otp":"719953"}'
$uri = "http://localhost:5000/api/delivery-otp/orders/ORD528653119/verify-otp"

Write-Host "`n🧪 Testing OTP Verification API" -ForegroundColor Cyan
Write-Host "URI: $uri" -ForegroundColor Yellow
Write-Host "Body: $body`n" -ForegroundColor Yellow

try {
    $response = Invoke-RestMethod -Uri $uri -Method POST -Headers @{"Content-Type"="application/json"} -Body $body
    Write-Host "✅ SUCCESS!" -ForegroundColor Green
    Write-Host ($response | ConvertTo-Json -Depth 5)
} catch {
    Write-Host "❌ ERROR!" -ForegroundColor Red
    Write-Host "Status: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
    Write-Host "Message: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host "Details: $($_.ErrorDetails.Message)" -ForegroundColor Red
    }
}
