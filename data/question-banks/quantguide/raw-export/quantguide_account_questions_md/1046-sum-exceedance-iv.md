# QuantGuide Question

## 1046. Sum Exceedance IV

**Metadata**

- ID: `2Yb3TGMTI1jWl0E70S9C`
- URL: https://www.quantguide.io/questions/sum-exceedance-iv
- Topic: probability
- Difficulty: hard
- Internal Difficulty: 3
- Companies: Hudson River Trading, Millennium Management, Jane Street, Citadel, Akuna
- Source: puzzlequant edited
- Tags: Expected Value, Conditional Expectation
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-10-6 10:59:14 America/New_York
- Last Edited By: Gabe

### 题干

A fair $5-$sided die with the values $1-5$ on the sides is rolled repeatedly until the sum of all upfaces is at least $5$. Find the expected number of times the die needs to be rolled.


### Hint

Let's denote the expected number of rolls needed to obtain a sum of at least $n$ starting from a sum of $k$ by $E_k$. Clearly we have that $E_n = 0$, as we already have a sum of $n$. Further, we have that $E_{n-1} = 1$, as no matter what is obtained, we have a sum of at least $n$. This is the more general version, and you can plug in $n = 5$ to get the answer here.

### 解答

We are going to solve the generalized version for $n-$sided die with a sum of at least $n$. Let's denote the expected number of rolls needed to obtain a sum of at least $n$ starting from a sum of $k$ by $E_k$. Clearly we have that $E_n = 0$, as we already have a sum of $n$. Further, we have that $E_{n-1} = 1$, as no matter what is obtained, we have a sum of at least $n$.

$$$$

Then, we have that $E_{n-2} = 1 + \dfrac{1}{n}E_{n-1} = 1 + \dfrac{1}{n}$, as with probability $\dfrac{1}{n}$, we obtain the value $1$ and we have a total sum of $n-1$. Similarly, $E_{n-3} = 1+ \dfrac{1}{n} E_{n-1} + \dfrac{1}{n}E_{n-2} = 1 + \dfrac{2}{n} + \dfrac{1}{n^2}$. By continuing with this pattern, one can prove by induction that $$E_{n-k} = \displaystyle \sum_{j=0}^{k-1} \dfrac{\binom{k-1}{j}}{n^j}$$ Therefore, by the Binomial Theorem, $E_0 = E_{n-n} = \displaystyle \sum_{j=0}^{n-1} \binom{n-1}{j}\left(\dfrac{1}{n}\right)^j = \left(1 + \dfrac{1}{n}\right)^{n-1}$ We applied the Binomial Theorem with $x = \dfrac{1}{n}$ and $y = 1$. Therefore, for $n = 5$, our answer is $\dfrac{6^4}{5^4} = \dfrac{1296}{625}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1296/625"
    ],
    "companies": [
      {
        "company": "Hudson River Trading"
      },
      {
        "company": "Millennium Management"
      },
      {
        "company": "Jane Street"
      },
      {
        "company": "Citadel"
      },
      {
        "company": "Akuna"
      }
    ],
    "difficulty": "hard",
    "hasEdits": false,
    "id": "2Yb3TGMTI1jWl0E70S9C",
    "internalDifficulty": 3,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-10-6 10:59:14 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 8520497,
    "randomizable": "",
    "source": "puzzlequant edited",
    "status": "published",
    "tags": [
      {
        "tag": "Expected Value"
      },
      {
        "tag": "Conditional Expectation"
      }
    ],
    "title": "Sum Exceedance IV",
    "topic": "probability",
    "urlEnding": "sum-exceedance-iv",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "Hudson River Trading"
      },
      {
        "company": "Millennium Management"
      },
      {
        "company": "Jane Street"
      },
      {
        "company": "Citadel"
      },
      {
        "company": "Akuna"
      }
    ],
    "difficulty": "hard",
    "id": "2Yb3TGMTI1jWl0E70S9C",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Expected Value"
      },
      {
        "tag": "Conditional Expectation"
      }
    ],
    "title": "Sum Exceedance IV",
    "topic": "probability",
    "urlEnding": "sum-exceedance-iv"
  }
}
```
