# QuantGuide Question

## 743. Upface Correlation

**Metadata**

- ID: `Zf0p0qZuaHePleT5T4SB`
- URL: https://www.quantguide.io/questions/upface-correlation
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 3
- Companies: Squarepoint Capital
- Source: og
- Tags: Covariance, Discrete Random Variables
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-29 10:51:03 America/New_York
- Last Edited By: Gabe

### 题干

Suppose that you roll a standard fair $6-$sided die $n$ times. Let $X$ be the random variable representing the number of times you roll a $1$ and $Y$ be the random variable representing the number of times you roll a $5$. Calculate $\text{Corr}(X,Y)$.

### Hint

Consider $\text{Var}(X+Y)$ for a quick solution. Otherwise, use indicators.

### 解答

We know that, by definition, Cov$(X,Y) = \mathbb{E}[XY] - \mathbb{E}[X]\mathbb{E}[Y]$. Let $X_i$ be the indicator of the event that you roll a $1$ on roll $i$, and $Y_i$ be the indicator of the event that you roll a $5$ on roll $i$. Thus, we have that $X = \displaystyle \sum_{i = 1}^n X_i$ and $Y = \displaystyle \sum_{i = 1}^n Y_i$. Plugging these in, we get that $$\text{Cov}(X,Y) = \mathbb{E}\left[\displaystyle \sum_{i = 1}^n X_i\displaystyle \sum_{i = 1}^n Y_i\right] - \mathbb{E}\left[\displaystyle \sum_{i = 1}^n X_i\right]\mathbb{E}\left[\displaystyle \sum_{i = 1}^n Y_i\right] = \mathbb{E}\left[\displaystyle \sum_{i = 1}^n \sum_{j=1}^n X_iY_j\right] - \mathbb{E}\left[\displaystyle \sum_{i = 1}^n X_i\right]\mathbb{E}\left[\displaystyle \sum_{i = 1}^n Y_i\right]$$ Evaluating the two expectations at the end are not difficult. Note that $\mathbb{E}\left[\displaystyle \sum_{i = 1}^n X_i\right] = \displaystyle \sum_{i = 1}^n \mathbb{E}[X_i]$ by linearity, and $\mathbb{E}[X_i] = \mathbb{P}[\text{roll a one on any given turn}] = \dfrac{1}{6}$. The similar logic applies to $\mathbb{E}[Y_i]$, and you also will get $\dfrac{1}{6}$ for that. Thus, $\displaystyle \sum_{i = 1}^n \dfrac{1}{6} = \dfrac{n}{6}$, so the second term comes out to be $\dfrac{n \cdot n}{6 \cdot 6} = \dfrac{n^2}{36}$. $$$$ Now, for the first sum, we need to be clever. We need to break this up into two sums: $i = j$ and $i \neq j$. This yields $$\mathbb{E}\left[\displaystyle \sum_{i = 1}^n \sum_{j=1}^n X_iY_j\right] = \mathbb{E}\left[\displaystyle \sum_{i\neq j} X_iY_j + \sum_{i=1}^n X_iY_i\right] = \displaystyle \sum_{i \neq j} \mathbb{E}[X_iY_j] + \sum_{i=1}^n \mathbb{E}[X_iY_i]$$ Now, let's deal with these sums individually. $\mathbb{E}[X_iY_i]$ takes the value of the probability that both $X_i$ and $Y_i$ occur. For both $X_i$ and $Y_i$ to occur, one would need to roll BOTH a one and a five on a single turn $i$. There is no chance of being able to do this, so $\mathbb{E}[X_iY_i] = 0$. Thus, the entire second sum evaluates to $0$. For the first expectation, it takes the value of the probability of both $X_i$ and $Y_j$ occurring. For both to occur, one would need to roll a $1$ on roll $i$ and a $5$ on roll $j$. Since we know $i \neq j$, this is definitely possible to occur, and since rolls are independent, the probability of this is just $\dfrac{1}{6} \cdot \dfrac{1}{6} = \dfrac{1}{36}$. Thus, the first sum evaluates to $\displaystyle \sum_{i \neq j} \dfrac{1}{36} = \dfrac{n(n-1)}{36}$. We get the $n(n-1)$ term from the fact that there were $n^2$ terms before in the sum $(n$ in the outer, $n$ in the inner sum, so $n \cdot n = n^2)$, and then we remove $n$ of them from that original double sum when separating out the case where $i \neq j$ from $i = j$, so there are $n^2 -n$ terms in the first sum remaining. Thus, plugging in, we have $\text{Cov}(X,Y) = \dfrac{n^2 - n}{36} - \dfrac{n^2}{36} = -\dfrac{n}{36}$.

$$$$

Note that there is a much quicker route to this solution: We have that $X + Y \sim \text{Binom}(n,1/3)$, as $X+Y$ counts the number of times that either $1$ or $5$ appears, and at least one of these appears per roll with probability $1/3$. The variance of $X+Y$ would therefore be $\dfrac{2n}{9}$ from the variance formula for binomials. We have that $\text{Var}(X)$ and $\text{Var}(Y)$ are both $\dfrac{5n}{36}$ from the variance of binomial formula. Plugging into the variance of a sum formula, $$\dfrac{2n}{9} = \dfrac{5n}{36} + \dfrac{5n}{36} + 2\text{Cov}(X,Y)$$ We have that $2\text{Cov}(X,Y) = -\dfrac{n}{18}$ after rearranging, meaning that $\text{Cov}(X,Y) = -\dfrac{n}{36}$.

$$$$

To find the correlation, $\sigma_X = \sigma_Y = \dfrac{\sqrt{5n}}{6}$ from the above. Therefore, $$\rho(X,Y) = \dfrac{\text{Cov}(X,Y)}{\sigma_X\sigma_Y} = \dfrac{-\frac{n}{36}}{\frac{5n}{36}} = -\dfrac{1}{5}$$ from the formula for correlation.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "-1/5"
    ],
    "companies": [
      {
        "company": "Squarepoint Capital"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "Zf0p0qZuaHePleT5T4SB",
    "internalDifficulty": 3,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-29 10:51:03 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 6099250,
    "source": "og",
    "status": "published",
    "tags": [
      {
        "tag": "Covariance"
      },
      {
        "tag": "Discrete Random Variables"
      }
    ],
    "title": "Upface Correlation",
    "topic": "probability",
    "urlEnding": "upface-correlation",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "Squarepoint Capital"
      }
    ],
    "difficulty": "medium",
    "id": "Zf0p0qZuaHePleT5T4SB",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Covariance"
      },
      {
        "tag": "Discrete Random Variables"
      }
    ],
    "title": "Upface Correlation",
    "topic": "probability",
    "urlEnding": "upface-correlation"
  }
}
```
