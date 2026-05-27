# QuantGuide Question

## 862. Normal LOTUS I

**Metadata**

- ID: `IA0CmfRDCDTVr0hsIygf`
- URL: https://www.quantguide.io/questions/normal-lotus
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: N/A
- Source: textbook
- Tags: Continuous Random Variables, Expected Value
- Premium: True
- Solution Free: False
- Version: 1
- Last Edited: 2023-10-31 08:28:26 America/New_York
- Last Edited By: Gabe

### 题干

Let $X$ and $Y$ be jointly continuous random variables with joint PDF given by $f(x,y) = xe^{-x(y+1)}I_{(0,\infty)}(x)I_{(0,\infty)}(y)$. Evaluate $\mathbb{E}\left[\dfrac{X}{Y+1}\right]$.

### Hint

Use LOTUS and note the form of the interior.

### 解答

By multivariate LOTUS, we can set up our double integral for this expectation as $$\mathbb{E}\left[\dfrac{X}{Y+1}\right] = \int_{\mathbb{R}} \int_{\mathbb{R}} \dfrac{x}{y+1} \cdot xe^{-x(y+1)}I_{(0,\infty)}(x)I_{(0,\infty)}(y)dydx$$ Combining and applying the indicators, we obtain $$\int_0^{\infty} \int_0^{\infty} \dfrac{x^2e^{-x(y+1)}}{y+1}dydx$$ Note that the inner integrand looks to be somewhat in the form of a Gamma$\left(3,\dfrac{1}{y+1}\right)$ random variable PDF. This is because of numerator specifically. We switch the order of integration because the variable of integration for this PDF is $X$. Therefore, we get $\displaystyle \int_0^{\infty} \dfrac{1}{y+1} \int_0^{\infty} x^2e^{-x(y+1)}dxdy$ after moving out the $\dfrac{1}{y+1}$. This integral must integrate to the normalizing constant that we would multiply and divide by to get the PDF. Since $a = 3$ and $b = \dfrac{1}{y+1}$ for this Gamma distribution, the normalizing constant is $\left(\dfrac{1}{y+1}\right)^3\Gamma(3) = \dfrac{2}{(y+1)^3}$. Therefore, the inner integral evaluates to $\dfrac{2}{(y+1)^3}$. Using this, we get the remaining integral as $$\int_0^{\infty} \dfrac{2}{(y+1)^4}dy$$ Some simple calculus shows that this last integral is just $\dfrac{2}{3}$, meaning that $\mathbb{E}\left[\dfrac{X}{Y+1}\right] = \dfrac{2}{3}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "2/3"
    ],
    "companies": [],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "IA0CmfRDCDTVr0hsIygf",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-10-31 08:28:26 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 7039494,
    "source": "textbook",
    "status": "published",
    "tags": [
      {
        "tag": "Continuous Random Variables"
      },
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Normal LOTUS I",
    "topic": "probability",
    "urlEnding": "normal-lotus",
    "version": 1
  },
  "list_summary": {
    "companies": [],
    "difficulty": "medium",
    "id": "IA0CmfRDCDTVr0hsIygf",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Continuous Random Variables"
      },
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Normal LOTUS I",
    "topic": "probability",
    "urlEnding": "normal-lotus"
  }
}
```
