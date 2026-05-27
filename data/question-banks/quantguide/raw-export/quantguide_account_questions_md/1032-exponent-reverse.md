# QuantGuide Question

## 1032. Exponent Reverse

**Metadata**

- ID: `MnSukfcKdc802vUhy7Q7`
- URL: https://www.quantguide.io/questions/exponent-reverse
- Topic: brainteasers
- Difficulty: medium
- Internal Difficulty: 2
- Companies: DRW
- Source: drw gd
- Tags: Calculus
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-2 20:48:53 America/New_York
- Last Edited By: Gabe

### 题干

Is $\pi^e$ or $e^{\pi}$ larger? Answer $1$ and $2$ for $\pi^e$ and $e^{\pi}$, respectively.

### Hint

Comparing $e^{\pi}$ and $\pi^e$ is equivalent to comparing $\pi \ln(e) = \pi$ and $e \ln(\pi)$.

### 解答

Comparing $e^{\pi}$ and $\pi^e$ is equivalent to comparing $\pi \ln(e) = \pi$ and $e \ln(\pi)$. This is since $\ln(x)$ is a strictly increasing function. Consider $\textbf{?}$ as an unknown relationship between the two quantities. Therefore, $$\pi \ln(e) \hspace{3pt} \textbf{?} \hspace{3pt} e \ln(\pi) \iff \dfrac{\ln(e)}{e} \hspace{3pt} \textbf{?}\hspace{3pt} \dfrac{\ln(\pi)}{\pi}$$ Consider the function $f(x) = \dfrac{\ln(x)}{x}$. By the quotient rule, $f'(x) = \dfrac{1-\ln(x)}{x^2}$. We have that $f'(x) > 0$ for all $0 < x < e$ and $f'(x) < 0$ for $x > e$. Therefore, $x = e$ is the maximum of this function. Therefore, we can confirm that $\dfrac{\ln(e)}{e} > \dfrac{\ln(\pi)}{\pi}$, so $e^{\pi} > \pi^e$. Our answer is $2$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "2"
    ],
    "companies": [
      {
        "company": "DRW"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "MnSukfcKdc802vUhy7Q7",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-2 20:48:53 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 8411170,
    "source": "drw gd",
    "status": "published",
    "tags": [
      {
        "tag": "Calculus"
      }
    ],
    "title": "Exponent Reverse",
    "topic": "brainteasers",
    "urlEnding": "exponent-reverse",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "DRW"
      }
    ],
    "difficulty": "medium",
    "id": "MnSukfcKdc802vUhy7Q7",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Calculus"
      }
    ],
    "title": "Exponent Reverse",
    "topic": "brainteasers",
    "urlEnding": "exponent-reverse"
  }
}
```
