# QuantGuide Question

## 477. Odd Coefficients

**Metadata**

- ID: `9GZcVsoOIlBBotgEY86a`
- URL: https://www.quantguide.io/questions/odd-coefficients
- Topic: brainteasers
- Difficulty: medium
- Internal Difficulty: 3
- Companies: N/A
- Source: discrete math book
- Tags: Combinatorics
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-13 16:14:20 America/New_York
- Last Edited By: Gabe

### 题干

Find the sum of all binomial coefficients $\displaystyle \binom{n}{k}$ with $n$ and $k$ being positive odd integers at most $1000$. Your answer is in the form $\dfrac{a^b - c}{d}$, where $a,b,c,$ and $d$ are integers and $b$ is maximal. Find $abcd$.

### Hint

We can write out all the binomial coefficients as follows:  $$\begin{matrix}
\binom{1}{1} & \binom{3}{1} & \binom{5}{1} & \binom{7}{1} & \dots & \binom{999}{1} \\ 
\\
 & \binom{3}{3} & \binom{5}{3} & \binom{7}{3} & \dots & \binom{999}{3}\\
\\
 & & \binom{5}{5} & \binom{7}{5} & \dots & \binom{999}{5} \\
\\
 & & & \binom{7}{7} & \dots & \binom{999}{7}\\
\\
& & & & \vdots & \vdots
\end{matrix}$$

### 解答

We can write out all the binomial coefficients as follows:  $$\begin{matrix}
\binom{1}{1} & \binom{3}{1} & \binom{5}{1} & \binom{7}{1} & \dots & \binom{999}{1} \\ 
\\
 & \binom{3}{3} & \binom{5}{3} & \binom{7}{3} & \dots & \binom{999}{3}\\
\\
 & & \binom{5}{5} & \binom{7}{5} & \dots & \binom{999}{5} \\
\\
 & & & \binom{7}{7} & \dots & \binom{999}{7}\\
\\
& & & & \vdots & \vdots
\end{matrix}$$

We only write out the entries for $n \geq k$, as the binomial coefficients are $0$ otherwise. Looking at the columns of this matrix, we see that the $k$th column of the matrix counts the number of odd subsets of $\{1,2,\dots, 2k-1\}$. Exactly half all subsets of any finite set are odd-sized. There are $2^n$ subsets of a set of size $n$. Therefore, exactly $2^{n-1}$ of them are odd. This means that the $k$th column sums to $2^{2k-1-1} = 4^{k-1}$. We can verify this holds for the first $4$ columns here. There are $500$ columns in this matrix, as the last corresponds to $999 = 2 \cdot 500 - 1$. Therefore, the sum of all of these is given by:

$$\displaystyle \sum_{k=1}^{500} 4^{k-1} = \sum_{k=0}^{499} 4^k = \dfrac{4^{500} - 1}{3}$$ Therefore, our answer is $4 \cdot 500 \cdot 3 \cdot 1 = 6000$.


### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "6000"
    ],
    "companies": [],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "9GZcVsoOIlBBotgEY86a",
    "internalDifficulty": 3,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-13 16:14:20 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 3817191,
    "source": "discrete math book",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Odd Coefficients",
    "topic": "brainteasers",
    "urlEnding": "odd-coefficients",
    "version": 1
  },
  "list_summary": {
    "companies": [],
    "difficulty": "medium",
    "id": "9GZcVsoOIlBBotgEY86a",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Odd Coefficients",
    "topic": "brainteasers",
    "urlEnding": "odd-coefficients"
  }
}
```
