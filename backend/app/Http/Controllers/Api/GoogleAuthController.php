<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Laravel\Socialite\Facades\Socialite;

class GoogleAuthController extends Controller
{
    public function redirect()
    {
        return Socialite::driver('google')->stateless()->redirect();
    }

    public function callback()
    {
        try {
            $googleUser = Socialite::driver('google')->stateless()->user();

            $user = User::updateOrCreate(
                ['email' => $googleUser->getEmail()],
                [
                    'google_id' => $googleUser->getId(),
                    'name' => $googleUser->getName(),
                    'avatar' => $googleUser->getAvatar(),
                ]
            );

            // Generate Sanctum token
            $token = $user->createToken('auth_token')->plainTextToken;

            // Redirect back to frontend
            $frontendUrl = env('FRONTEND_URL', 'http://localhost:3000');
            return redirect()->to("{$frontendUrl}/auth/callback?token={$token}");

        } catch (\Exception $e) {
            $frontendUrl = env('FRONTEND_URL', 'http://localhost:3000');
            return redirect()->to("{$frontendUrl}/login?error=auth_failed");
        }
    }
}
