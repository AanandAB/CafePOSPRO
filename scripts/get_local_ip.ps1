# PowerShell script to get local IP address

function Get-LocalIPAddress {
    try {
        $ip = (Get-NetIPConfiguration | Where-Object { $_.IPv4DefaultGateway -ne $null }).IPv4Address.IPAddress
        return $ip
    }
    catch {
        # Fallback method
        $ip = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.AddressState -eq "Preferred" -and $_.PrefixOrigin -ne "WellKnown" }).IPAddress
        return $ip
    }
}

function Get-NetworkInfo {
    $localIP = Get-LocalIPAddress
    $info = @{
        local_ip = $localIP
    }
    return $info | ConvertTo-Json
}

# Main execution
if ($MyInvocation.InvocationName -ne '.') {
    Write-Output (Get-NetworkInfo)
}