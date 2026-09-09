package com.zappymart.domain.accounts;

import com.zappymart.domain.shared.Result;
import com.zappymart.domain.shared.UserErrorCode;

public final class PasswordPolicy {

    public static final int SHORTEST = 12;

    public static final int LONGEST = 128;

    private PasswordPolicy() {
    }

    public static Result<String> check(String password) {
        if (password == null || password.length() < SHORTEST) {
            return Result.refuse(UserErrorCode.PASSWORD_TOO_SHORT,
                    "A password is at least " + SHORTEST + " characters long.", "input.password");
        }
        if (password.length() > LONGEST) {
            return Result.refuse(UserErrorCode.PASSWORD_TOO_LONG,
                    "A password is at most " + LONGEST + " characters long.", "input.password");
        }
        return Result.of(password);
    }
}
