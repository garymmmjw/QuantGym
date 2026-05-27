# QuantGuide Question

## 186. Gamma Review III

**Metadata**

- ID: `hxm1f8kSo4iViPL2KZgF`
- URL: https://www.quantguide.io/questions/gamma-review-iii
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 2
- Companies: N/A
- Source: original
- Tags: Continuous Random Variables
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-10-16 10:03:35 America/New_York
- Last Edited By: Gabe

### 题干

Let $X \sim \text{Gamma}(2,4)$. Note that this is the shape-scale parameterization of Gamma. Evaluate $\mathbb{E}[X^6]$. The answer is in the form $a^b \cdot c!$ for integers $a,b,c$, with $a$ minimal. Find $a + b + c$.

### Hint

Use the normalization trick of integrals to transform the integral obtained after LOTUS into something that looks like a Gamma PDF with new parameters.

### 解答

We are going to evaluate this for general $a,b,$ and $k$. The condition for existence of this expectation is that $a + k > 0$. One can verify this by looking at the definition of the Gamma integral. This is clearly satisfied here.

$$$$

In this more general case, we have $\displaystyle \mathbb{E}[X^k] = \int_0^{\infty} \dfrac{x^{(a+k)-1}e^{-\frac{x}{b}}}{b^a\Gamma(a)}dx$ by combining the Gamma PDF with the $x^k$ term obtained from LOTUS. This integral now seems to have the same form as the $\text{Gamma}(a,b)$ PDF but instead with $a+k$ instead of $a$. Therefore, we will want to normalize to a $\text{Gamma}(a+k,b)$ PDF. We need to normalize so that we get $a+k$ everywhere we have $a$. 

$$$$

The denominator must become $b^{a+k}\Gamma(a+k)$, so multiplying and dividing by this, we get $$\dfrac{b^{a+k}\Gamma(a+k)}{b^a\Gamma(a)}\int_0^{\infty} \dfrac{x^{(a+k)-1}e^{-\frac{x}{b}}}{b^{a+k}\Gamma(a+k)}dx$$ The integrand is just the PDF of a Gamma$(a+k,b)$ distribution over the entire support, so it is $1$. Therefore, we get that $$\mathbb{E}[X^k] = \dfrac{b^k\Gamma(a+k)}{\Gamma(a)}$$ Plugging in our specific values of $a = 2, b = 4, k = 6$, we get that $$\mathbb{E}[X^6] = \dfrac{4^6 \cdot \Gamma(8)}{\Gamma(2)} = 4^6 \cdot 7! = 2^{12} \cdot 7!$$ This means our answer is $2 + 12 + 7 = 21$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "17"
    ],
    "companies": [],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "hxm1f8kSo4iViPL2KZgF",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-10-16 10:03:35 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 1451331,
    "source": "original",
    "status": "published",
    "tags": [
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Gamma Review III",
    "topic": "probability",
    "urlEnding": "gamma-review-iii",
    "version": 1
  },
  "list_summary": {
    "companies": [],
    "difficulty": "easy",
    "id": "hxm1f8kSo4iViPL2KZgF",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Gamma Review III",
    "topic": "probability",
    "urlEnding": "gamma-review-iii"
  }
}
```
