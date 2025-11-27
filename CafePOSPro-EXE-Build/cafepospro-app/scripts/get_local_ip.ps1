# PowerShell script to get local IP address

function Get-LocalIPAddress {
    try {
        $ip = (Get-NetIPConfiguration | Where-Object { $_.IPv4DefaultGateway -ne $null }).IPv4Address.IPAddress
        return $ip
    }
    catch {
        # Fallback method
        try {
            $ip = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.AddressState -eq "Preferred" -and $_.PrefixOrigin -ne "WellKnown" }).IPAddress
            return $ip
        }
        catch {
            Write-Error "Failed to get local IP address: $_"
            return $null
        }
    }
}

function Get-NetworkInfo {
    try {
        $localIP = Get-LocalIPAddress
        $info = @{
            local_ip = $localIP
        }
        return $info
    }
    catch {
        Write-Error "Failed to get network info: $_"
        # Return fallback
        return @{
            local_ip = "127.0.0.1"
        }
    }
}

# Main execution
if ($MyInvocation.InvocationName -ne '.') {
    try {
        $result = Get-NetworkInfo
        Write-Output ($result | ConvertTo-Json)
    }
    catch {
        Write-Error "Script execution failed: $_"
        # Output fallback JSON
        $fallback = @{
            local_ip = "127.0.0.1"
        }
        Write-Output ($fallback | ConvertTo-Json)
        exit 1
    }
}